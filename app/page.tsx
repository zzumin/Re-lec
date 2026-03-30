'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { cn } from '@/lib/utils';

interface SubjectData {
  professor: string;
  styleNotes: string[];
  sessions: string[];
  updatedAt: string;
}

export default function Home() {
  const [data, setData] = useState<Record<string, Record<string, SubjectData>>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ semester: string; subject: string } | null>(null);

  const loadData = () =>
    fetch('/api/subjects').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (semester: string, subject: string) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semester, subject }),
      });
      if (!res.ok) {
        const err = await res.text();
        alert(`삭제 실패: ${err}`);
        return;
      }
      setConfirmDelete(null);
      loadData();
    } catch (e) {
      alert(`네트워크 오류: ${String(e)}`);
    }
  };

  const totalSubjects = Object.values(data).reduce((a, s) => a + Object.keys(s).length, 0);
  const totalSessions = Object.values(data).reduce((a, s) =>
    a + Object.values(s).reduce((b, sub) => b + sub.sessions.length, 0), 0);

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 min-h-screen p-8 max-md:p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-extrabold bg-gradient-to-br from-violet-400 to-cyan-400 bg-clip-text text-transparent">Re:Lec</h1>
            <p className="text-sm text-[#9494b0] mt-1">강의 재구성 · 퀴즈 · 복습을 한 곳에서</p>
          </div>
          <Button asChild>
            <Link href="/upload">＋ 새 수업 업로드</Link>
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-violet-400">{Object.keys(data).length}</span>
            <span className="text-[#5a5a78]">학기</span>
          </div>
          <div className="w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-cyan-300">{totalSubjects}</span>
            <span className="text-[#5a5a78]">과목</span>
          </div>
          <div className="w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-emerald-300">{totalSessions}</span>
            <span className="text-[#5a5a78]">수업</span>
          </div>
        </div>

        {/* Subject list */}
        {loading ? (
          <div className="flex items-center gap-3 text-[#5a5a78] py-10">
            <div className="w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            불러오는 중...
          </div>
        ) : Object.keys(data).length === 0 ? (
          <div className="text-center py-20 text-[#5a5a78]">
            <div className="text-base font-semibold text-[#9494b0] mb-1">아직 수업이 없습니다</div>
            <div className="text-sm mb-6">설정에서 과목을 등록하고 첫 번째 수업을 업로드하세요</div>
            <Button asChild><Link href="/upload">새 수업 업로드</Link></Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(data).map(([semester, subjects]) => (
              <div key={semester}>
                {/* Semester header */}
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="semester">{semester}</Badge>
                  <span className="text-xs text-[#5a5a78]">{Object.keys(subjects).length}개 과목</span>
                </div>

                {/* Subject rows */}
                <div className="border border-white/[0.08] rounded-xl overflow-hidden">
                  {Object.entries(subjects).map(([subject, info], idx, arr) => {
                    const isConfirming = confirmDelete?.semester === semester && confirmDelete?.subject === subject;
                    return (
                      <div
                        key={subject}
                        className={cn(
                          'flex items-center group transition-colors duration-150',
                          idx !== arr.length - 1 && 'border-b border-white/[0.06]'
                        )}
                      >
                        <Link
                          href={`/subject/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}`}
                          className="flex-1 flex items-center gap-4 px-5 py-3.5 no-underline hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-[#f1f1f8] group-hover:text-violet-300 transition-colors">
                              {subject}
                            </span>
                          </div>
                          <div className="text-xs text-[#5a5a78] w-32 truncate hidden sm:block">{info.professor}</div>
                          <div className="text-xs text-[#9494b0] w-20 text-right hidden sm:block">{info.sessions.length}회 수업</div>
                          <div className="w-20 flex justify-end">
                            {info.styleNotes.length > 0 && <Badge variant="purple" className="text-[10px]">스타일</Badge>}
                          </div>
                          <span className="text-[#5a5a78] group-hover:text-violet-400 transition-colors text-sm">›</span>
                        </Link>

                        {/* 삭제 버튼 */}
                        <div className="pr-3 pl-1">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(semester, subject)}
                                className="text-[11px] px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] text-[#9494b0] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete({ semester, subject })}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-[#3a3a58] hover:text-red-400 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
