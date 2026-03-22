'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';

interface SubjectData {
  professor: string;
  styleNotes: string[];
  sessions: string[];
  updatedAt: string;
}

type QuestionType = '단답형' | 'OX' | '빈칸채우기' | '서술형';

const QUESTION_TYPES: QuestionType[] = ['단답형', 'OX', '빈칸채우기', '서술형'];

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const semester = decodeURIComponent(params.semester as string);
  const subject = decodeURIComponent(params.subject as string);

  const [info, setInfo] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // Session selection state
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Titles: keyed by date, fallback to date string
  const [titles, setTitles] = useState<Record<string, string>>({});

  // Edit state: which date is being edited
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Quiz generation
  const [quizTypes, setQuizTypes] = useState<Record<QuestionType, boolean>>({
    '단답형': true,
    'OX': true,
    '빈칸채우기': false,
    '서술형': false,
  });
  const [quizCounts, setQuizCounts] = useState<Record<QuestionType, number>>({
    '단답형': 3,
    'OX': 2,
    '빈칸채우기': 2,
    '서술형': 1,
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/subjects');
        const d = await r.json();
        const subjectData: SubjectData | null = d[semester]?.[subject] || null;
        setInfo(subjectData);
        if (subjectData) {
          const titleEntries = await Promise.all(
            subjectData.sessions.map(async (date: string) => {
              try {
                const tr = await fetch(
                  `/api/sessions/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`
                );
                if (tr.ok) {
                  const m = await tr.json();
                  return [date, m.title ?? date] as [string, string];
                }
              } catch {
                // ignore
              }
              return [date, date] as [string, string];
            })
          );
          setTitles(Object.fromEntries(titleEntries));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [semester, subject]);

  const selectedDates = Object.entries(checked)
    .filter(([, v]) => v)
    .map(([k]) => k);

  function toggleCheck(date: string) {
    setChecked(prev => ({ ...prev, [date]: !prev[date] }));
  }

  function startEdit(date: string) {
    setEditingDate(date);
    setEditValue(titles[date] ?? date);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function commitEdit(date: string) {
    const newTitle = editValue.trim() || date;
    setTitles(prev => ({ ...prev, [date]: newTitle }));
    setEditingDate(null);
    // Persist via PATCH
    try {
      await fetch(
        `/api/sessions/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        }
      );
    } catch {
      // Silently fail — local state already updated
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent, date: string) {
    if (e.key === 'Enter') commitEdit(date);
    if (e.key === 'Escape') setEditingDate(null);
  }

  async function handleGenerateQuiz() {
    setGenError(null);
    setGenerating(true);
    const counts: Partial<Record<QuestionType, number>> = {};
    for (const type of QUESTION_TYPES) {
      if (quizTypes[type] && quizCounts[type] > 0) {
        counts[type] = quizCounts[type];
      }
    }
    if (Object.keys(counts).length === 0) {
      setGenError('문제 유형을 하나 이상 선택하고 개수를 설정해주세요.');
      setGenerating(false);
      return;
    }
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester,
          subject,
          sessions: selectedDates,
          counts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || '문제 생성에 실패했습니다.');
        setGenerating(false);
        return;
      }
      router.push(`/quiz/session/${data.id}`);
    } catch (err) {
      setGenError(String(err));
      setGenerating(false);
    }
  }

  const sortedSessions = info ? [...info.sessions].sort().reverse() : [];

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <main className="min-h-screen p-8 max-md:p-5 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/"
            className="text-[13px] text-[#5a5a78] no-underline hover:text-[#9494b0] transition-colors"
          >
            ← 대시보드
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="semester">{semester}</Badge>
          </div>
          <h1 className="text-[28px] font-extrabold text-[#f1f1f8]">{subject}</h1>
          {info && <p className="text-sm text-[#9494b0] mt-1.5">👤 {info.professor}</p>}
        </div>

        <div className="grid grid-cols-[1fr_288px] gap-6 max-md:grid-cols-1">
          {/* Left column: Session list */}
          <div>
            <div className="text-sm font-bold mb-3 text-[#9494b0]">수업 목록</div>

            {loading ? (
              <div className="text-center py-10">
                <div className="w-[18px] h-[18px] rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto" />
              </div>
            ) : !info || sortedSessions.length === 0 ? (
              <div className="text-center py-[60px] text-[#5a5a78]">
                <div className="text-base font-semibold text-[#9494b0]">수업이 없습니다</div>
              </div>
            ) : (
              <>
                {sortedSessions.map(date => (
                  <div
                    key={date}
                    className="flex items-center gap-3 px-4 py-3.5 bg-[#111118] border border-white/[0.08] rounded-xl mb-2 group"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={!!checked[date]}
                      onChange={() => toggleCheck(date)}
                      className="w-4 h-4 accent-violet-500 flex-shrink-0 cursor-pointer"
                    />

                    {/* Title (editable) */}
                    <div className="flex-1 min-w-0">
                      {editingDate === date ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(date)}
                          onKeyDown={e => handleEditKeyDown(e, date)}
                          className="w-full bg-[#1e1e2a] border border-violet-500/60 rounded-lg px-2 py-1 text-sm text-[#f1f1f8] outline-none"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#f1f1f8]">
                          {titles[date] ?? date}
                        </span>
                      )}
                    </div>

                    {/* Edit icon button */}
                    <button
                      onClick={() => startEdit(date)}
                      title="이름 변경"
                      className="text-[#5a5a78] hover:text-[#9494b0] transition-colors flex-shrink-0 p-1 rounded"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    {/* Arrow link to result */}
                    <Link
                      href={`/result/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`}
                      className="text-[#5a5a78] hover:text-violet-400 transition-colors flex-shrink-0 text-lg no-underline"
                      title="결과 보기"
                    >
                      ›
                    </Link>
                  </div>
                ))}

                {/* Quiz generation section (shown when sessions are selected) */}
                {selectedDates.length > 0 && (
                  <div
                    className="mt-4 p-5 bg-[#111118] border border-violet-500/30 rounded-xl"
                  >
                    <div className="text-sm font-bold text-[#f1f1f8] mb-4">
                      문제 만들기 — 선택된 수업: {selectedDates.length}개
                    </div>

                    <div className="space-y-3 mb-4">
                      {QUESTION_TYPES.map(type => (
                        <div key={type} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`qtype-${type}`}
                            checked={quizTypes[type]}
                            onChange={e =>
                              setQuizTypes(prev => ({ ...prev, [type]: e.target.checked }))
                            }
                            className="w-4 h-4 accent-violet-500 flex-shrink-0 cursor-pointer"
                          />
                          <label
                            htmlFor={`qtype-${type}`}
                            className="text-sm text-[#f1f1f8] w-24 cursor-pointer"
                          >
                            {type}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={quizCounts[type]}
                            disabled={!quizTypes[type]}
                            onChange={e =>
                              setQuizCounts(prev => ({
                                ...prev,
                                [type]: Math.max(1, parseInt(e.target.value) || 1),
                              }))
                            }
                            className="w-16 bg-[#1e1e2a] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-[#f1f1f8] text-center outline-none disabled:opacity-40"
                          />
                          <span className="text-xs text-[#5a5a78]">문제</span>
                        </div>
                      ))}
                    </div>

                    {genError && (
                      <div className="text-xs text-red-400 mb-3">{genError}</div>
                    )}

                    <Button
                      onClick={handleGenerateQuiz}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? (
                        <span className="flex items-center gap-2 justify-center">
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          생성 중...
                        </span>
                      ) : (
                        '문제 생성'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column: Style analysis + Add button */}
          <div>
            <div className="text-sm font-bold mb-3 text-[#9494b0]">교수 스타일 분석</div>
            <Card>
              <CardContent className="p-5">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                  </div>
                ) : !info || info.styleNotes.length === 0 ? (
                  <div className="text-[#5a5a78] text-[13px] text-center py-5">
                    수업을 더 추가하면 스타일 분석이 쌓입니다
                  </div>
                ) : (
                  info.styleNotes.map((note, i) => (
                    <div key={i} className="text-[13px] text-[#a8a8c4] leading-relaxed whitespace-pre-line">
                      {note}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/upload">새 수업 추가</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
