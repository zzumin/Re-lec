import { NextRequest, NextResponse } from 'next/server';
import { listSubjects } from '@/lib/storage';

export async function GET() {
  try {
    const subjects = listSubjects();
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
