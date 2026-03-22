import { NextRequest, NextResponse } from 'next/server';
import { getResult } from '@/lib/storage';
import { generateQuiz } from '@/lib/gemini';
import { saveQuizSet, initialSM2, type QuizSet, type QuizQuestion, type QuestionType } from '@/lib/quiz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { semester, subject, sessions, counts } = body as {
      semester: string;
      subject: string;
      sessions: string[];
      counts: Partial<Record<QuestionType, number>>;
    };

    if (!semester || !subject || !sessions?.length) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const totalCount = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
    if (totalCount === 0) {
      return NextResponse.json({ error: '문제 유형과 개수를 선택해주세요.' }, { status: 400 });
    }

    // 선택한 수업의 강의 해설 로드
    const lectureContents: string[] = [];
    for (const date of sessions) {
      const result = getResult(semester, subject, date);
      if (result) lectureContents.push(`--- ${date} 수업 ---\n${result}`);
    }

    if (!lectureContents.length) {
      return NextResponse.json({ error: '선택한 수업의 강의 해설을 찾을 수 없습니다.' }, { status: 400 });
    }

    // Gemini로 문제 생성
    const rawQuestions = await generateQuiz(lectureContents, counts);

    if (!rawQuestions.length) {
      return NextResponse.json({ error: '문제 생성에 실패했습니다. 다시 시도해주세요.' }, { status: 500 });
    }

    // QuizQuestion 형식으로 변환 (id + SM2 상태 추가)
    const questions: QuizQuestion[] = rawQuestions.map(q => ({
      ...q,
      id: crypto.randomUUID().slice(0, 8),
      sm2: initialSM2(),
    }));

    const id = `${Date.now()}-${encodeURIComponent(semester)}-${encodeURIComponent(subject)}`;
    const sessionLabels = sessions.join(', ');

    const quizSet: QuizSet = {
      id,
      semester,
      subject,
      sourceSessions: sessions,
      createdAt: new Date().toISOString(),
      title: `${subject} — ${sessionLabels}`,
      questions,
    };

    saveQuizSet(quizSet);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: `오류: ${String(error)}` }, { status: 500 });
  }
}
