import { NextResponse } from 'next/server';
import { listQuizSets } from '@/lib/quiz';

export async function GET() {
  try {
    const quizSets = listQuizSets();
    return NextResponse.json(quizSets);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
