'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Link from 'next/link';


interface SubjectPreset { professor: string; characteristics?: string; }

export default function SettingsPage() {
  const [presets, setPresets] = useState<Record<string, Record<string, SubjectPreset>>>({});

  // Add-subject form state
  const [showForm, setShowForm] = useState(false);
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [professor, setProfessor] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(d => setPresets(d.presets || {}));
  }, []);

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
      setMsg('과목이 추가되었습니다.');
      setPresets(p => {
        const np = { ...p };
        if (!np[semester]) np[semester] = {};
        np[semester][subject] = { professor, characteristics };
        return np;
      });
      setSemester(''); setSubject(''); setProfessor(''); setCharacteristics('');
      setTimeout(() => { setShowForm(false); setMsg(''); }, 1200);
    }
    setAdding(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen p-8 max-md:ml-0 max-md:p-5">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#5a5a78] hover:text-[#9494b0] transition-colors mb-4 no-underline">
            ‹ 대시보드로
          </Link>
          <h1 className="text-[28px] font-extrabold text-[#f1f1f8]">설정</h1>
          <p className="text-sm text-[#9494b0] mt-1.5">수강 과목 등록 및 관리</p>
        </div>

        <div className="max-w-[680px] flex flex-col gap-6">
          {/* Subject Management */}
          <Card>
            <CardContent className="p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[15px] font-bold text-[#f1f1f8]">수강 과목 관리</div>
                  <div className="text-[13px] text-[#5a5a78] mt-0.5">
                    과목을 등록해두면 업로드 시 선택만 하면 됩니다
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={showForm ? 'secondary' : 'default'}
                  onClick={() => { setShowForm(v => !v); setMsg(''); }}
                >
                  {showForm ? '✕ 닫기' : '＋ 과목 추가'}
                </Button>
              </div>

              {/* Add subject form */}
              {showForm && (
                <div className="bg-[#0d0d14] border border-white/[0.08] rounded-xl p-5 mb-5">
                  <div className="text-[13px] font-semibold text-violet-400 mb-4">새 과목 정보 입력</div>
                  <div className="grid grid-cols-2 gap-3 mb-3 max-md:grid-cols-1">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">학기 *</label>
                      <Input placeholder="2026-1학기" value={semester} onChange={e => setSemester(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">과목명 *</label>
                      <Input placeholder="면역학" value={subject} onChange={e => setSubject(e.target.value)} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">교수님 성함 *</label>
                    <Input placeholder="홍길동 교수님" value={professor} onChange={e => setProfessor(e.target.value)} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">수업 특징 (선택)</label>
                    <textarea
                      placeholder="예: 판서 위주 수업, 임상 사례 중심, 교수님이 강조하는 키워드 위주로 정리 선호..."
                      value={characteristics}
                      onChange={e => setCharacteristics(e.target.value)}
                      rows={3}
                      className="w-full bg-[#111118] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f8] resize-none focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-[#3a3a52]"
                    />
                    <div className="text-[11px] text-[#5a5a78] mt-1">강의 해설 생성 시 참고합니다</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={addSubject}
                      disabled={adding || !semester || !subject || !professor}
                    >
                      {adding ? '추가 중...' : '+ 과목 추가'}
                    </Button>
                    {msg && <span className="text-[13px] text-[#9494b0]">{msg}</span>}
                  </div>
                </div>
              )}

              {/* Existing subjects */}
              {Object.keys(presets).length === 0 ? (
                <div className="text-[13px] text-[#5a5a78] text-center py-6">
                  아직 등록된 과목이 없습니다. 위 버튼으로 추가해보세요.
                </div>
              ) : (
                Object.entries(presets).map(([sem, subjects]) => (
                  <div key={sem} className="mb-4 last:mb-0">
                    <div className="mb-2">
                      <Badge variant="semester">{sem}</Badge>
                    </div>
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                      {Object.entries(subjects).map(([subj, info], idx, arr) => (
                        <div
                          key={subj}
                          className={`flex items-center justify-between px-4 py-3 ${idx !== arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-[#f1f1f8]">{subj}</div>
                            <div className="text-xs text-[#5a5a78] mt-0.5">
                              {info.professor}
                              {info.characteristics && (
                                <span className="ml-2 text-[#4a4a62]">· {info.characteristics.slice(0, 40)}{info.characteristics.length > 40 ? '…' : ''}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={`/upload?semester=${encodeURIComponent(sem)}&subject=${encodeURIComponent(subj)}`}>
                              수업 추가
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
