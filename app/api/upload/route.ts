import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseFile } from '@/lib/parser';
import { generateLectureNote } from '@/lib/gemini';
import { saveSession, saveStyleUpdate, getSubjectInfo, getPreviousSessions } from '@/lib/storage';

const SUBJECTS_CONFIG = path.join(process.cwd(), 'data', '_config', 'subjects.json');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const semester = formData.get('semester') as string;
    const subject = formData.get('subject') as string;
    const transcriptionFile = formData.get('transcription') as File;
    const slideFiles = formData.getAll('slides') as File[];

    if (!semester || !subject || !transcriptionFile) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // Auto-generate date from server time (YYYY-MM-DD)
    const date = new Date().toISOString().split('T')[0];

    // Look up professor from presets config, fallback to subject.json
    let professor = '';
    if (fs.existsSync(SUBJECTS_CONFIG)) {
      const presets = JSON.parse(fs.readFileSync(SUBJECTS_CONFIG, 'utf-8'));
      professor = presets[semester]?.[subject]?.professor || '';
    }
    if (!professor) {
      professor = getSubjectInfo(semester, subject)?.professor || subject;
    }

    // Parse transcription
    const transcriptionBuffer = Buffer.from(await transcriptionFile.arrayBuffer());
    const transcription = await parseFile(transcriptionBuffer, transcriptionFile.name);

    // Parse all slide files and concatenate
    let slideContent: string | null = null;
    const validSlides = slideFiles.filter(f => f && f.size > 0);
    if (validSlides.length > 0) {
      const parts: string[] = [];
      for (const file of validSlides) {
        const buf = Buffer.from(await file.arrayBuffer());
        const text = await parseFile(buf, file.name);
        parts.push(validSlides.length > 1 ? `[파일: ${file.name}]\n${text}` : text);
      }
      slideContent = parts.join('\n\n---\n\n');
    }

    // Get existing style notes and previous sessions
    const existingSubject = getSubjectInfo(semester, subject);
    const existingStyleNotes = existingSubject?.styleNotes || [];
    const previousSessions = getPreviousSessions(semester, subject, date);

    // Generate lecture note and style analysis via Gemini
    const { lectureNote, styleNote } = await generateLectureNote(
      transcription,
      slideContent,
      existingStyleNotes,
      previousSessions
    );

    // Save everything to disk
    saveSession(semester, subject, date, {
      date,
      subject,
      semester,
      professor,
      createdAt: new Date().toISOString(),
    }, transcription, lectureNote);

    if (styleNote && styleNote !== '변경 없음') {
      saveStyleUpdate(semester, subject, professor, date, styleNote);
    } else {
      saveStyleUpdate(semester, subject, professor, date, '');
    }

    return NextResponse.json({ success: true, semester, subject, date });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `처리 중 오류 발생: ${String(error)}` },
      { status: 500 }
    );
  }
}
