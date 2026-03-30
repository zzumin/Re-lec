'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { cn } from '@/lib/utils';

interface SubjectData {
  professor: string;
  styleNotes: string[];
  sessions: string[];
  updatedAt: string;
}

interface SubjectPreset { professor: string; characteristics?: string; }

export default function Home() {
  const [data, setData] = useState<Record<string, Record<string, SubjectData>>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ semester: string; subject: string } | null>(null);

  // 과목 추가 모달
  const [showModal, setShowModal] = useState(false);
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [professor, setProfessor] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

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
      if (!res.ok) { alert(`삭제 실패: ${await res.text()}`); return; }
      setConfirmDelete(null);
      loadData();
    } catch (e) {
      alert(`네트워크 오류: ${String(e)}`);
    }
  };

  const addSubject = async () => {
    setAdding(true); setMsg('');
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semester, subject, professor, characteristics }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg('오류: ' + d.error);
    } else {
      setMsg('추가됐습니다!');
      setSemester(''); setSubject(''); setProfessor(''); setCharacteristics('');
      setTimeout(() => { setShowModal(false); setMsg(''); }, 1000);
    }
    setAdding(false);
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
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowModal(true)}
              className="text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.05] text-[#9494b0] border border-white/[0.08] hover:bg-white/[0.08] hover:text-[#f1f1f8] transition-colors"
            >
              ＋ 과목 추가
            </button>
            <Button asChild><Link href="/upload">＋ 새 수업 업로드</Link></Button>
          </div>
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
            <div className="text-sm mb-6">과목을 등록하고 첫 번째 수업을 업로드하세요</div>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => setShowModal(true)}>과목 추가</Button>
              <Button asChild><Link href="/upload">새 수업 업로드</Link></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(data).map(([sem, subjects]) => (
              <div key={sem}>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="semester">{sem}</Badge>
                  <span className="text-xs text-[#5a5a78]">{Object.keys(subjects).length}개 과목</span>
                </div>
                <div className="border border-white/[0.08] rounded-xl overflow-hidden">
                  {Object.entries(subjects).map(([subj, info], idx, arr) => {
                    const isConfirming = confirmDelete?.semester === sem && confirmDelete?.subject === subj;
                    return (
                      <div
                        key={subj}
                        className={cn(
                          'flex items-center group transition-colors duration-150',
                          idx !== arr.length - 1 && 'border-b border-white/[0.06]'
                        )}
                      >
                        <Link
                          href={`/subject/${encodeURIComponent(sem)}/${encodeURIComponent(subj)}`}
                          className="flex-1 flex items-center gap-4 px-5 py-3.5 no-underline hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-[#f1f1f8] group-hover:text-violet-300 transition-colors">
                              {subj}
                            </span>
                          </div>
                          <div className="text-xs text-[#5a5a78] w-32 truncate hidden sm:block">{info.professor}</div>
                          <div className="text-xs text-[#9494b0] w-20 text-right hidden sm:block">{info.sessions.length}회 수업</div>
                          <div className="w-20 flex justify-end">
                            {info.styleNotes.length > 0 && <Badge variant="purple" className="text-[10px]">스타일</Badge>}
                          </div>
                          <span className="text-[#5a5a78] group-hover:text-violet-400 transition-colors text-sm">›</span>
                        </Link>
                        <div className="pr-3 pl-1">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(sem, subj)}
                                className="text-[11px] px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                              >삭제</button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] text-[#9494b0] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                              >취소</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete({ semester: sem, subject: subj })}
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

      {/* 과목 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setMsg(''); }}>
          <div className="w-full max-w-md mx-4 bg-[#16161f] border border-white/[0.10] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-[#f1f1f8]">과목 추가</h3>
              <button onClick={() => { setShowModal(false); setMsg(''); }} className="text-[#5a5a78] hover:text-[#9494b0] transition-colors">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#5a5a78] mb-1.5">학기 *</label>
                  <select
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                    className="w-full bg-[#0e0e16] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f8] focus:outline-none focus:border-violet-500/60 transition-all"
                  >
                    <option value="" disabled>선택</option>
                    <option>2024-1학기</option>
                    <option>2024-2학기</option>
                    <option>2025-1학기</option>
                    <option>2025-2학기</option>
                    <option>2026-1학기</option>
                    <option>2026-2학기</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#5a5a78] mb-1.5">과목명 *</label>
                  <Input placeholder="면역학" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#5a5a78] mb-1.5">교수님 *</label>
                <Input placeholder="홍길동 교수님" value={professor} onChange={e => setProfessor(e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#5a5a78] mb-1.5">수업 특징 (선택)</label>
                <textarea
                  placeholder="판서 위주, 임상 사례 중심..."
                  value={characteristics}
                  onChange={e => setCharacteristics(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0e0e16] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f8] resize-none focus:outline-none focus:border-violet-500/60 transition-all placeholder:text-[#3a3a52]"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button onClick={addSubject} disabled={adding || !semester || !subject || !professor}>
                  {adding ? '추가 중...' : '+ 과목 추가'}
                </Button>
                {msg && <span className="text-[13px] text-emerald-400">{msg}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
