'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PresetSubject { professor: string; }

// SVG progress ring — time-based, fills over ~2 min, caps at 90%
function ProgressRing({ progress }: { progress: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);
  return (
    <svg width="72" height="72" className="flex-shrink-0">
      {/* Track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="5" />
      {/* Fill */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* % text */}
      <text x="36" y="41" textAnchor="middle" fill="#a78bfa" fontSize="13" fontWeight="700" fontFamily="sans-serif">
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

function UploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [presets, setPresets] = useState<Record<string, Record<string, PresetSubject>>>({});
  const [selectedSemester, setSelectedSemester] = useState(searchParams.get('semester') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '');
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [slideFiles, setSlideFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [noKey, setNoKey] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(d => setPresets(d.presets || {}));
    fetch('/api/settings').then(r => r.json()).then(d => { if (!d.hasKey) setNoKey(true); });
  }, []);

  // Progress ring timer
  useEffect(() => {
    if (loading) {
      startTimeRef.current = Date.now();
      setProgress(2);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
        // Asymptotic approach to 90% over ~120s
        const p = 90 * (1 - Math.exp(-3 * (elapsed / 120000)));
        setProgress(Math.min(p, 90));
      }, 600);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      startTimeRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const addSlideFiles = (files: FileList | null) => {
    if (!files) return;
    setSlideFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newFiles = Array.from(files).filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newFiles];
    });
  };

  const removeSlideFile = (idx: number) =>
    setSlideFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!transcriptionFile) { setError('녹취록 파일을 업로드해주세요.'); return; }
    if (!selectedSemester || !selectedSubject) { setError('학기와 과목을 선택해주세요.'); return; }

    setLoading(true); setError('');

    const formData = new FormData();
    formData.append('semester', selectedSemester);
    formData.append('subject', selectedSubject);
    formData.append('transcription', transcriptionFile);
    slideFiles.forEach(f => formData.append('slides', f));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류 발생');
      setProgress(100);
      setTimeout(() => {
        router.push(`/result/${encodeURIComponent(selectedSemester)}/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(data.date)}`);
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const allSemesters = Object.keys(presets);
  const subjectsForSemester = selectedSemester ? Object.keys(presets[selectedSemester] || {}) : [];

  const selectClass = cn(
    'flex h-10 w-full rounded-xl bg-[#111118] border border-white/[0.08] px-4 py-2 text-sm text-[#f1f1f8] font-sans',
    'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
    'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
    'transition-all duration-200 appearance-none'
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0a0a0f]">
        <ProgressRing progress={progress} />
        <div className="text-center">
          <div className="text-[15px] font-semibold text-[#f1f1f8] mb-1">강의 해설 생성 중...</div>
          <div className="text-sm text-[#5a5a78]">녹취록을 분석하고 재구성하는 중입니다. 1~3분 소요됩니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="min-h-screen p-8 max-md:p-5 max-w-[720px] mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-[13px] text-[#5a5a78] no-underline hover:text-[#9494b0] transition-colors">
            ← 대시보드
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-[28px] font-extrabold text-[#f1f1f8]">새 수업 업로드</h1>
          <p className="text-sm text-[#9494b0] mt-1.5">과목을 선택하고 파일을 업로드하면 강의 해설이 생성됩니다</p>
        </div>

        {noKey && (
          <div className="mb-5 px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-300">
            Gemini API key가 설정되지 않았습니다.{' '}
            <Link href="/settings" className="text-violet-400 underline">.env.local</Link>에서 먼저 설정해주세요.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Subject selection */}
          <div className="mb-6">
            <div className="flex flex-row gap-3 mb-2">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">학기</label>
                <select
                  className={selectClass}
                  value={selectedSemester}
                  onChange={e => { setSelectedSemester(e.target.value); setSelectedSubject(''); }}
                  required
                  disabled={allSemesters.length === 0}
                >
                  <option value="">— 학기 선택 —</option>
                  {allSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#9494b0] mb-1.5">과목</label>
                <select
                  className={selectClass}
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  required
                  disabled={!selectedSemester}
                >
                  <option value="">— 과목 선택 —</option>
                  {subjectsForSemester.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#5a5a78]">
                {selectedSubject && presets[selectedSemester]?.[selectedSubject]
                  ? `👤 ${presets[selectedSemester][selectedSubject].professor} · 날짜는 업로드 시각으로 자동 저장됩니다`
                  : allSemesters.length === 0 ? '먼저 과목을 등록해주세요' : ''}
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/settings">＋ 과목 추가</Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/[0.06] mb-6" />

          {/* File uploads */}
          <Card className="mb-5">
            <CardContent className="p-6 space-y-5">
              <div className="text-sm font-bold text-violet-400">파일 업로드</div>

              {/* Transcription */}
              <div>
                <label className="block text-[13px] font-semibold text-[#9494b0] mb-2">녹취록 * (.doc, .docx)</label>
                <div className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer relative',
                  transcriptionFile
                    ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                    : 'border-white/[0.08] hover:border-violet-500/60 hover:bg-violet-500/[0.04]'
                )}>
                  <input
                    type="file"
                    accept=".doc,.docx"
                    onChange={e => setTranscriptionFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-sm text-[#9494b0]">{transcriptionFile ? transcriptionFile.name : '클릭하거나 드래그하세요'}</div>
                  <div className="text-[11px] text-[#5a5a78] mt-1">.doc, .docx 지원</div>
                </div>
              </div>

              {/* Slide files — multiple */}
              <div>
                <label className="block text-[13px] font-semibold text-[#9494b0] mb-2">강의 자료 (선택, 여러 개 가능) — .pdf, .pptx</label>

                {/* File list */}
                {slideFiles.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {slideFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-emerald-500/[0.06] border border-emerald-500/30 rounded-lg text-sm">
                        <span className="text-emerald-400">·</span>
                        <span className="flex-1 text-[#f1f1f8] truncate text-[13px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSlideFile(i)}
                          className="text-[#5a5a78] hover:text-[#fca5a5] transition-colors text-xs px-1"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                <div className={cn(
                  'border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 cursor-pointer relative',
                  'border-white/[0.08] hover:border-violet-500/60 hover:bg-violet-500/[0.04]'
                )}>
                  <input
                    type="file"
                    accept=".pdf,.pptx,.ppt"
                    multiple
                    onChange={e => addSlideFiles(e.target.files)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-sm text-[#9494b0]">
                    {slideFiles.length > 0 ? `+ 파일 추가 (현재 ${slideFiles.length}개)` : '클릭하거나 드래그하세요'}
                  </div>
                  <div className="text-[11px] text-[#5a5a78] mt-1">.pdf, .pptx 지원 · 여러 개 선택 가능</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="mb-4 px-5 py-4 bg-red-500/10 border border-red-500/25 rounded-xl text-[#fca5a5] text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            강의 해설 생성하기
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    }>
      <UploadForm />
    </Suspense>
  );
}
