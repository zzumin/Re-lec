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

  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
                  {Object.entries(subjects).map(([subject, info], idx, arr) => (
                    <Link
                      key={subject}
                      href={`/subject/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}`}
                      className={cn(
                        'flex items-center gap-4 px-5 py-3.5 no-underline transition-colors duration-150',
                        'hover:bg-white/[0.04] group',
                        idx !== arr.length - 1 && 'border-b border-white/[0.06]'
                      )}
                    >
                      {/* Subject name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[#f1f1f8] group-hover:text-violet-300 transition-colors">
                          {subject}
                        </span>
                      </div>

                      {/* Professor */}
                      <div className="text-xs text-[#5a5a78] w-32 truncate hidden sm:block">
                        {info.professor}
                      </div>

                      {/* Session count */}
                      <div className="text-xs text-[#9494b0] w-20 text-right hidden sm:block">
                        {info.sessions.length}회 수업
                      </div>

                      {/* Style badge */}
                      <div className="w-24 flex justify-end">
                        {info.styleNotes.length > 0 && (
                          <Badge variant="purple" className="text-[10px]">스타일</Badge>
                        )}
                      </div>

                      {/* Arrow */}
                      <span className="text-[#5a5a78] group-hover:text-violet-400 transition-colors text-sm">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
