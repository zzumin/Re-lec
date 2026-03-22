import { NextRequest, NextResponse } from 'next/server';
import { applySM2, getQuizSet, updateQuizQuestion } from '@/lib/quiz';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { questionId, grade } = await request.json() as {
      questionId: string;
      grade: 0 | 1 | 2 | 3 | 4 | 5;
    };

    const quizSet = getQuizSet(id);
    if (!quizSet) {
      return NextResponse.json({ error: '퀴즈를 찾을 수 없습니다.' }, { status: 404 });
    }

    const question = quizSet.questions.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다.' }, { status: 404 });
    }

    const newSm2 = applySM2(question.sm2, grade);
    updateQuizQuestion(id, questionId, newSm2);

    return NextResponse.json({ newSm2 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
