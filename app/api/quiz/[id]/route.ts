import { NextRequest, NextResponse } from 'next/server';
import { getQuizSet } from '@/lib/quiz';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quizSet = getQuizSet(id);
  if (!quizSet) {
    return NextResponse.json({ error: '퀴즈를 찾을 수 없습니다.' }, { status: 404 });
  }
  return NextResponse.json(quizSet);
}
