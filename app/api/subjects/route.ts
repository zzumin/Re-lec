import { NextRequest, NextResponse } from 'next/server';
import { listSubjects, deleteSubject } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

const SUBJECTS_CONFIG = path.join(process.cwd(), 'data', '_config', 'subjects.json');

export async function GET() {
  try {
    return NextResponse.json(listSubjects());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { semester, subject } = await request.json();
    if (!semester || !subject) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    deleteSubject(semester, subject);
    // 프리셋에서도 삭제
    if (fs.existsSync(SUBJECTS_CONFIG)) {
      const presets = JSON.parse(fs.readFileSync(SUBJECTS_CONFIG, 'utf-8'));
      if (presets[semester]?.[subject]) {
        delete presets[semester][subject];
        if (Object.keys(presets[semester]).length === 0) delete presets[semester];
        fs.writeFileSync(SUBJECTS_CONFIG, JSON.stringify(presets, null, 2), 'utf-8');
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
