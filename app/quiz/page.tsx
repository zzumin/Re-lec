'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { QuizSet, QuestionType, Difficulty } from '@/lib/quiz';

interface SubjectData {
  professor: string;
  sessions: string[];
  styleNotes: string[];
  updatedAt: string;
}

const QUESTION_TYPES: { type: QuestionType; label: string; desc: string }[] = [
  { type: '단답형', label: '단답형', desc: '핵심 용어 및 개념 확인' },
  { type: 'OX', label: 'OX 퀴즈', desc: '참/거짓 판단' },
  { type: '빈칸채우기', label: '빈칸 채우기', desc: '핵심 용어 완성' },
  { type: '서술형', label: '서술형', desc: '개념 설명 및 분석' },
];

export default function QuizPage() {
  const router = useRouter();
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Record<string, SubjectData>>>({});
  const [dueCount, setDueCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Form state
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [typeCounts, setTypeCounts] = useState<Partial<Record<QuestionType, number>>>({
    '단답형': 5, 'OX': 5, '빈칸채우기': 3, '서술형': 2,
  });
  const [enabledTypes, setEnabledTypes] = useState<Record<QuestionType, boolean>>({
    '단답형': true, 'OX': true, '빈칸채우기': true, '서술형': true,
  });
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(['하', '중', '상']);

  const DIFFICULTIES: { d: Difficulty; label: string; desc: string; color: string }[] = [
    { d: '하', label: '하', desc: '기본 용어·정의', color: 'emerald' },
    { d: '중', label: '중', desc: '개념 이해·흐름', color: 'cyan' },
    { d: '상', label: '상', desc: '연결·적용·분석', color: 'violet' },
    { d: '지엽', label: '지엽', desc: '세부 수치·예외', color: 'amber' },
  ];

  const toggleDifficulty = (d: Difficulty) => {
    setSelectedDifficulties(prev =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter(x => x !== d) : prev  // 최소 1개
        : [...prev, d]
    );
  };

  useEffect(() => {
    fetch('/api/quiz/list').then(r => r.json()).then(setQuizSets).catch(() => {});
    fetch('/api/subjects').then(r => r.json()).then(setSubjects).catch(() => {});
    fetch('/api/quiz/review').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setDueCount(d.length);
    }).catch(() => {});
  }, []);

  const availableSessions = selectedSemester && selectedSubject
    ? (subjects[selectedSemester]?.[selectedSubject]?.sessions ?? []).sort().reverse()
    : [];

  const toggleSession = (date: string) => {
    setSelectedSessions(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const toggleAllSessions = () => {
    if (selectedSessions.length === availableSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions([...availableSessions]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSemester || !selectedSubject || !selectedSessions.length) {
      setGenError('학기, 과목, 수업을 선택해주세요.');
      return;
    }
    const counts = Object.fromEntries(
      QUESTION_TYPES
        .filter(({ type }) => enabledTypes[type])
        .map(({ type }) => [type, typeCounts[type] ?? 0])
    ) as Partial<Record<QuestionType, number>>;

    const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
    if (total === 0) {
      setGenError('최소 한 가지 문제 유형과 개수를 선택해주세요.');
      return;
    }

    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semester: selectedSemester, subject: selectedSubject, sessions: selectedSessions, counts, difficulties: selectedDifficulties }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/quiz/session/${encodeURIComponent(data.id)}`);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  };

  const selectClass = cn(
    'flex h-10 w-full rounded-xl bg-[#111118] border border-white/[0.08] px-4 py-2 text-sm text-[#f1f1f8] font-sans',
    'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
    'disabled:opacity-50 cursor-pointer transition-all duration-200 appearance-none'
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen p-8 max-md:ml-0 max-md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#f1f1f8]">퀴즈 📝</h1>
            <p className="text-sm text-[#9494b0] mt-1.5">강의 내용으로 교수님 수준의 시험 문제를 자동 생성합니다</p>
          </div>
          <div className="flex gap-3">
            {dueCount > 0 && (
              <Button asChild variant="secondary">
                <Link href="/quiz/review">
                  🔁 오늘 복습 <Badge variant="amber" className="ml-1.5">{dueCount}</Badge>
                </Link>
              </Button>
            )}
            <Button onClick={() => setCreating(c => !c)}>
              {creating ? '✕ 닫기' : '＋ 새 퀴즈 만들기'}
            </Button>
          </div>
        </div>

        {/* Quiz creation form */}
        {creating && (
          <Card className="mb-8 border-violet-500/30">
            <CardContent className="p-6">
              <div className="text-sm font-bold mb-5 text-violet-400">✨ 새 퀴즈 만들기</div>

              {/* Semester + Subject */}
              <div className="grid grid-cols-2 gap-4 mb-5 max-md:grid-cols-1">
                <div>
                  <label className="block text-[13px] font-semibold text-[#9494b0] mb-2">학기</label>
                  <select
                    className={selectClass}
                    value={selectedSemester}
                    onChange={e => { setSelectedSemester(e.target.value); setSelectedSubject(''); setSelectedSessions([]); }}
                  >
                    <option value="">— 학기 선택 —</option>
                    {Object.keys(subjects).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#9494b0] mb-2">과목</label>
                  <select
                    className={selectClass}
                    value={selectedSubject}
                    onChange={e => { setSelectedSubject(e.target.value); setSelectedSessions([]); }}
                    disabled={!selectedSemester}
                  >
                    <option value="">— 과목 선택 —</option>
                    {selectedSemester && Object.keys(subjects[selectedSemester] || {}).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Session selector */}
              {availableSessions.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-semibold text-[#9494b0]">수업 선택 *</label>
                    <button
                      onClick={toggleAllSessions}
                      className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {selectedSessions.length === availableSessions.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">
                    {availableSessions.map(date => (
                      <label
                        key={date}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm',
                          selectedSessions.includes(date)
                            ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                            : 'bg-[#111118] border-white/[0.08] text-[#9494b0] hover:border-white/20'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-violet-500"
                          checked={selectedSessions.includes(date)}
                          onChange={() => toggleSession(date)}
                        />
                        {date}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Question types */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#9494b0] mb-3">문제 유형 및 개수</label>
                <div className="space-y-2">
                  {QUESTION_TYPES.map(({ type, label, desc }) => (
                    <div
                      key={type}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                        enabledTypes[type]
                          ? 'bg-violet-500/10 border-violet-500/30'
                          : 'bg-[#111118] border-white/[0.08]'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-violet-500 w-4 h-4 flex-shrink-0"
                        checked={enabledTypes[type]}
                        onChange={e => setEnabledTypes(prev => ({ ...prev, [type]: e.target.checked }))}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-[#f1f1f8]">{label}</span>
                        <span className="text-xs text-[#5a5a78] ml-2">{desc}</span>
                      </div>
                      {enabledTypes[type] && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={typeCounts[type] ?? 5}
                            onChange={e => setTypeCounts(prev => ({ ...prev, [type]: parseInt(e.target.value) || 1 }))}
                            className="w-16 text-center h-8 text-xs"
                          />
                          <span className="text-xs text-[#5a5a78]">문제</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty selector */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#9494b0] mb-3">난이도 선택</label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTIES.map(({ d, label, desc, color }) => {
                    const on = selectedDifficulties.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDifficulty(d)}
                        className={cn(
                          'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all',
                          on
                            ? `bg-${color}-500/10 border-${color}-500/40 text-${color}-300`
                            : 'bg-[#111118] border-white/[0.08] text-[#5a5a78] hover:border-white/20'
                        )}
                      >
                        <span className="text-base font-bold">{label}</span>
                        <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#5a5a78] mt-2">선택한 난이도로 문제를 균등 배분합니다</p>
              </div>

              {genError && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-[#fca5a5] text-sm">
                  ⚠️ {genError}
                </div>
              )}

              {generating && (
                <div className="mb-4 flex items-center gap-3 px-4 py-3.5 bg-violet-500/10 border border-violet-500/25 rounded-xl text-sm text-violet-400">
                  <div className="w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin flex-shrink-0" />
                  Gemini 2.5 Pro가 문제를 출제 중입니다... (1~2분 소요)
                </div>
              )}

              <Button onClick={handleGenerate} disabled={generating} size="lg" className="w-full">
                {generating ? '생성 중...' : '🚀 퀴즈 생성하기'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quiz sets list */}
        {quizSets.length === 0 ? (
          <div className="text-center py-16 text-[#5a5a78]">
            <div className="text-[48px] mb-4 opacity-50">📝</div>
            <div className="text-base font-semibold text-[#9494b0]">아직 생성된 퀴즈가 없습니다</div>
            <div className="text-[13px] mt-1.5">새 퀴즈 만들기를 눌러 시작하세요</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-bold text-[#9494b0] mb-3">내 퀴즈 세트</div>
            {quizSets.map(quiz => {
              const dueInThis = quiz.questions.filter(
                q => q.sm2.dueDate <= new Date().toISOString().slice(0, 10)
              ).length;
              return (
                <Card key={quiz.id} className="hover:bg-[#1e1e2a] transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="semester">{quiz.semester}</Badge>
                        {dueInThis > 0 && (
                          <Badge variant="amber">복습 {dueInThis}장</Badge>
                        )}
                      </div>
                      <div className="text-sm font-bold text-[#f1f1f8]">{quiz.title}</div>
                      <div className="text-xs text-[#5a5a78] mt-0.5">
                        총 {quiz.questions.length}문제 · 생성일 {quiz.createdAt.slice(0, 10)}
                      </div>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/quiz/session/${encodeURIComponent(quiz.id)}`}>
                        학습하기 →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
