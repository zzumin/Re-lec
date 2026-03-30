import { NextRequest, NextResponse } from 'next/server';
import { listSubjects, deleteSubject } from '@/lib/storage';

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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
