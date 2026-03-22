'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { QuizQuestion, QuestionType } from '@/lib/quiz';

interface DueCard {
  quizId: string;
  quizTitle: string;
  question: QuizQuestion;
}

const TYPE_COLORS: Record<QuestionType, string> = {
  '단답형': 'cyan',
  'OX': 'purple',
  '빈칸채우기': 'amber',
  '서술형': 'green',
};

type Phase = 'idle' | 'revealed';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedOx, setSelectedOx] = useState<'O' | 'X' | null>(null);
  const [grades, setGrades] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/quiz/review')
      .then(r => r.json())
      .then((data: DueCard[]) => {
        setCards(shuffle(Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const submitAnswer = useCallback(async (quizId: string, questionId: string, grade: 0 | 1 | 2 | 3 | 4 | 5) => {
    setSubmitting(true);
    await fetch(`/api/quiz/${encodeURIComponent(quizId)}/answer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, grade }),
    });
    setGrades(prev => [...prev, grade]);
    setSubmitting(false);
  }, []);

  const advance = () => {
    setCurrentIndex(i => i + 1);
    setPhase('idle');
    setSelectedOx(null);
  };

  const handleOxSelect = async (choice: 'O' | 'X') => {
    if (phase === 'revealed') return;
    const { quizId, question: q } = cards[currentIndex];
    setSelectedOx(choice);
    setPhase('revealed');
    await submitAnswer(quizId, q.id, choice === q.answer ? 4 : 1);
  };

  const handleGrade = async (grade: 1 | 3 | 5) => {
    const { quizId, question: q } = cards[currentIndex];
    await submitAnswer(quizId, q.id, grade);
    advance();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // No due cards
  if (!loading && cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] flex-col gap-4 text-center px-4">
        <div className="text-[64px]">✨</div>
        <h1 className="text-2xl font-extrabold text-[#f1f1f8]">오늘 복습 완료!</h1>
        <p className="text-[#9494b0]">오늘 복습할 카드가 없습니다. 내일 다시 확인하세요.</p>
        <Button asChild variant="secondary"><Link href="/quiz">← 퀴즈 목록</Link></Button>
      </div>
    );
  }

  // All done
  if (currentIndex >= cards.length) {
    const correctCount = grades.filter(g => g >= 3).length;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-[64px] mb-4">🎊</div>
          <h1 className="text-2xl font-extrabold text-[#f1f1f8] mb-2">복습 완료!</h1>
          <p className="text-[#9494b0] mb-6">오늘의 모든 카드를 복습했습니다</p>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-violet-400">{cards.length}</div>
                  <div className="text-xs text-[#5a5a78] mt-1">복습 카드</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{correctCount}</div>
                  <div className="text-xs text-[#5a5a78] mt-1">알고 있음</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{cards.length - correctCount}</div>
                  <div className="text-xs text-[#5a5a78] mt-1">재복습 예정</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button asChild><Link href="/quiz">← 퀴즈 목록으로</Link></Button>
        </div>
      </div>
    );
  }

  const { quizTitle, question: q } = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;
  const typeColor = TYPE_COLORS[q.type];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <Link href="/quiz" className="text-[13px] text-[#5a5a78] hover:text-[#9494b0] transition-colors no-underline">
            ← 목록
          </Link>
          <span className="text-sm text-[#9494b0]">{currentIndex + 1} / {cards.length}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-[#5a5a78] mt-1.5 truncate">{quizTitle}</div>
      </div>

      {/* Question card */}
      <div className="w-full max-w-2xl">
        <Card className="mb-4">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={typeColor as Parameters<typeof Badge>[0]['variant']}>{q.type}</Badge>
              <span className="text-xs text-[#5a5a78]">복습</span>
            </div>
            <p className="text-[17px] text-[#f1f1f8] leading-relaxed font-medium">{q.question}</p>
            {q.hint && q.type === '빈칸채우기' && (
              <div className="mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-300">
                💡 힌트: {q.hint}
              </div>
            )}
          </CardContent>
        </Card>

        {q.type === 'OX' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(['O', 'X'] as const).map(choice => {
                const isSelected = selectedOx === choice;
                const isCorrect = q.answer === choice;
                const showResult = phase === 'revealed';
                return (
                  <button
                    key={choice}
                    onClick={() => handleOxSelect(choice)}
                    disabled={phase === 'revealed'}
                    className={cn(
                      'h-24 rounded-2xl text-4xl font-bold border-2 transition-all duration-200',
                      showResult
                        ? isCorrect
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : isSelected && !isCorrect
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-white/[0.04] border-white/[0.08] text-[#5a5a78]'
                        : 'bg-[#16161f] border-white/[0.08] text-[#f1f1f8] hover:border-violet-500 hover:bg-violet-500/10 cursor-pointer'
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {phase === 'revealed' && (
              <>
                <Card className={cn('border', selectedOx === q.answer ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10')}>
                  <CardContent className="p-4">
                    <div className={cn('font-bold mb-1', selectedOx === q.answer ? 'text-emerald-400' : 'text-red-400')}>
                      {selectedOx === q.answer ? '✅ 정답!' : `❌ 오답 — 정답: ${q.answer}`}
                    </div>
                    {q.explanation && <p className="text-sm text-[#9494b0] leading-relaxed">{q.explanation}</p>}
                  </CardContent>
                </Card>
                <Button className="w-full" onClick={advance} disabled={submitting}>다음 →</Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {phase === 'idle' ? (
              <Button className="w-full" variant="secondary" size="lg" onClick={() => setPhase('revealed')}>
                정답 확인
              </Button>
            ) : (
              <>
                <Card className="border-emerald-500/30 bg-emerald-500/10">
                  <CardContent className="p-5">
                    <div className="text-xs font-semibold text-emerald-400 mb-1.5">정답</div>
                    <p className="text-[15px] text-[#f1f1f8] font-medium leading-relaxed">{q.answer}</p>
                    {q.explanation && (
                      <>
                        <div className="h-px bg-white/[0.06] my-3" />
                        <div className="text-xs font-semibold text-[#5a5a78] mb-1">해설</div>
                        <p className="text-sm text-[#9494b0] leading-relaxed">{q.explanation}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
                <div className="text-xs text-center text-[#5a5a78] mb-1">얼마나 알고 있었나요?</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleGrade(1)}
                    disabled={submitting}
                    className="py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    😞 몰랐음
                  </button>
                  <button
                    onClick={() => handleGrade(3)}
                    disabled={submitting}
                    className="py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    🤔 헷갈렸음
                  </button>
                  <button
                    onClick={() => handleGrade(5)}
                    disabled={submitting}
                    className="py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    ✅ 완벽히 알았음
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
