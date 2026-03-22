import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureDir, getSubjectDir, listSubjects } from '@/lib/storage';

const SUBJECTS_CONFIG = path.join(process.cwd(), 'data', '_config', 'subjects.json');

// GET: list all preset subjects
export async function GET() {
  try {
    const all = listSubjects();
    // Also include any subjects that are in config but have no sessions yet
    let presets: Record<string, Record<string, { professor: string }>> = {};
    if (fs.existsSync(SUBJECTS_CONFIG)) {
      presets = JSON.parse(fs.readFileSync(SUBJECTS_CONFIG, 'utf-8'));
    }
    return NextResponse.json({ subjects: all, presets });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: create a new subject preset
export async function POST(request: NextRequest) {
  try {
    const { semester, subject, professor, characteristics } = await request.json();
    if (!semester || !subject || !professor) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 });
    }

    // Save to config file
    ensureDir(path.dirname(SUBJECTS_CONFIG));
    let presets: Record<string, Record<string, { professor: string; characteristics?: string }>> = {};
    if (fs.existsSync(SUBJECTS_CONFIG)) {
      presets = JSON.parse(fs.readFileSync(SUBJECTS_CONFIG, 'utf-8'));
    }
    if (!presets[semester]) presets[semester] = {};
    presets[semester][subject] = { professor, ...(characteristics ? { characteristics } : {}) };
    fs.writeFileSync(SUBJECTS_CONFIG, JSON.stringify(presets, null, 2), 'utf-8');

    // Also create the subject directory
    const dir = getSubjectDir(semester, subject);
    ensureDir(dir);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
