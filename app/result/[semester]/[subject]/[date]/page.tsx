'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import MermaidChart from '../../../../components/MermaidChart';

interface ResultData {
  result: string;
  styleInfo?: {
    professor: string;
    styleNotes: string[];
    sessions: string[];
  };
}

interface Highlight {
  id: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: string;
}

interface SelectionPopup {
  x: number;
  y: number;
  text: string;
}

interface AskModal {
  selectedText: string;
  question: string;
  answer: string;
  loading: boolean;
}

const HL_COLORS: { key: Highlight['color']; bg: string; label: string }[] = [
  { key: 'yellow', bg: '#fbbf24', label: '노랑' },
  { key: 'green',  bg: '#34d399', label: '초록' },
  { key: 'blue',   bg: '#60a5fa', label: '파랑' },
  { key: 'pink',   bg: '#f472b6', label: '분홍' },
];

function applyHighlights(markdown: string, highlights: Highlight[]): string {
  if (!highlights.length) return markdown;
  // 긴 텍스트부터 처리해 중첩 방지
  const sorted = [...highlights].sort((a, b) => b.text.length - a.text.length);
  let result = markdown;
  for (const hl of sorted) {
    const escaped = hl.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(escaped, 'g'),
      `<mark class="hl-${hl.color}" data-hl-id="${hl.id}">${hl.text}</mark>`
    );
  }
  return result;
}

export default function ResultPage() {
  const params = useParams();
  const semester = decodeURIComponent(params.semester as string);
  const subject = decodeURIComponent(params.subject as string);
  const date = decodeURIComponent(params.date as string);

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>(date);

  // 편집 모드
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 하이라이트
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // 드래그 팝업
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);

  // 질문 모달
  const [askModal, setAskModal] = useState<AskModal | null>(null);

  const articleRef = useRef<HTMLElement>(null);

  const hlApiBase = `/api/highlights/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`;

  useEffect(() => {
    fetch(`/api/result/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setData(d); setEditContent(d.result); }
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });

    fetch(`/api/sessions/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`)
      .then(r => r.ok ? r.json() : null)
      .then(m => { if (m?.title) setSessionTitle(m.title); })
      .catch(() => {});

    fetch(hlApiBase)
      .then(r => r.json())
      .then(setHighlights)
      .catch(() => {});
  }, [semester, subject, date, hlApiBase]);

  // 텍스트 선택 감지
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (editMode) return;
    // mark 클릭 시 무시 (삭제 핸들러가 따로 처리)
    if ((e.target as HTMLElement).tagName === 'MARK') return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) { setSelectionPopup(null); return; }

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionPopup({
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + window.scrollY - 52,
      text,
    });
  }, [editMode]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const hide = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-selection-popup]')) setSelectionPopup(null);
    };
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, []);

  // mark 클릭 → 하이라이트 삭제
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest('mark[data-hl-id]');
      if (!mark) return;
      const id = mark.getAttribute('data-hl-id')!;
      fetch(hlApiBase, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).then(() => setHighlights(prev => prev.filter(h => h.id !== id)));
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [hlApiBase]);

  const handleHighlight = async (color: Highlight['color']) => {
    if (!selectionPopup) return;
    const { text } = selectionPopup;
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();

    const res = await fetch(hlApiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, color }),
    });
    const newHl: Highlight = await res.json();
    setHighlights(prev => [...prev, newHl]);
  };

  const handleCopy = () => {
    if (data?.result) {
      navigator.clipboard.writeText(data.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePdf = async () => {
    if (!articleRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const el = articleRef.current;

    const styleTag = document.createElement('style');
    styleTag.id = '__pdf-override';
    styleTag.textContent = `
      article.prose h2 { color: #6d28d9 !important; }
      article.prose h3 { color: #0e7490 !important; }
      article.prose strong { color: #111 !important; }
      article.prose p, article.prose li { color: #1a1a1a !important; }
      article.prose code { background: #f0f4ff !important; color: #0055aa !important; border-color: #c4c4e0 !important; }
      .callout { background: transparent !important; color: #1a1a1a !important; }
      .callout.exam { border-color: #b45309 !important; }
      .callout.exam::before { color: #b45309 !important; }
      .callout.key  { border-color: #6d28d9 !important; }
      .callout.key::before  { color: #6d28d9 !important; }
      .callout.hard { border-color: #be123c !important; }
      .callout.hard::before { color: #be123c !important; }
    `;
    document.head.appendChild(styleTag);

    const prevStyle = el.getAttribute('style') || '';
    el.style.background = '#fff';
    el.style.color = '#1a1a1a';
    el.style.border = 'none';
    el.style.borderRadius = '0';
    el.style.padding = '0';

    try {
      await html2pdf().set({
        margin: [14, 16, 14, 16],
        filename: `${subject}-${sessionTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['h2', 'h3', '.callout', 'blockquote'] },
      }).from(el).save();
    } finally {
      el.setAttribute('style', prevStyle);
      document.getElementById('__pdf-override')?.remove();
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/result/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result: editContent }) }
      );
      if (res.ok) {
        setData(prev => prev ? { ...prev, result: editContent } : prev);
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAskOpen = (text: string) => {
    setSelectionPopup(null);
    setAskModal({ selectedText: text, question: '', answer: '', loading: false });
  };

  const handleAskSubmit = async () => {
    if (!askModal || !askModal.question.trim() || !data) return;
    setAskModal(prev => prev ? { ...prev, loading: true, answer: '' } : prev);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: askModal.question,
          selectedText: askModal.selectedText,
          noteContext: data.result,
        }),
      });
      const json = await res.json();
      setAskModal(prev => prev ? { ...prev, loading: false, answer: json.answer || json.error } : prev);
    } catch (e) {
      setAskModal(prev => prev ? { ...prev, loading: false, answer: String(e) } : prev);
    }
  };

  const renderedMarkdown = data ? applyHighlights(data.result, highlights) : '';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen p-8 max-md:ml-0 max-md:p-5">
        {/* Print-only header */}
        <div className="print-header">
          <div style={{ fontSize: '11pt', color: '#555', marginBottom: 4 }}>{semester} · {subject}</div>
          <div style={{ fontSize: '18pt', fontWeight: 700, color: '#111' }}>강의 해설 — {sessionTitle}</div>
          {data?.styleInfo && <div style={{ fontSize: '10pt', color: '#666', marginTop: 4 }}>{data.styleInfo.professor}</div>}
        </div>

        {/* Breadcrumb */}
        <div className="no-print flex items-center gap-2 mb-4 text-[13px] text-[#5a5a78]">
          <Link href="/" className="text-[#5a5a78] no-underline hover:text-[#9494b0] transition-colors">대시보드</Link>
          <span>›</span>
          <Link href={`/subject/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}`} className="text-[#5a5a78] no-underline hover:text-[#9494b0] transition-colors">
            {subject}
          </Link>
          <span>›</span>
          <span className="text-[#9494b0]">{sessionTitle}</span>
        </div>

        {/* Header */}
        <div className="no-print flex items-start justify-between mb-6">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="semester">{semester}</Badge>
              <Badge variant="cyan">{subject}</Badge>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#f1f1f8]">강의 해설 — {sessionTitle}</h1>
            {data?.styleInfo && (
              <p className="text-[13px] text-[#5a5a78] mt-1">{data.styleInfo.professor}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            {data?.styleInfo?.styleNotes?.length ? (
              <Button variant="secondary" size="sm" onClick={() => setShowStyle(!showStyle)}>
                스타일 분석
              </Button>
            ) : null}
            {!editMode ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setEditContent(data?.result ?? ''); setEditMode(true); }}>
                  편집
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? '복사됨' : '복사'}
                </Button>
                <Button variant="secondary" size="sm" onClick={handlePdf}>
                  PDF 저장
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} disabled={saving}>
                  취소
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Style panel */}
        {showStyle && data?.styleInfo?.styleNotes && (
          <Card className="no-print mb-6 border-violet-500/30">
            <CardContent className="p-5">
              <div className="font-bold mb-3 text-violet-400">
                {data.styleInfo.professor} 교수님 스타일 분석
              </div>
              {data.styleInfo.styleNotes.map((note, i) => (
                <div key={i} className="text-[13px] text-[#a8a8c4] leading-relaxed whitespace-pre-line">
                  {note}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-[60px] text-[#5a5a78]">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
            <p>강의 해설 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-4 bg-red-500/10 border border-red-500/25 rounded-xl text-[#fca5a5] text-sm">
            {error}
          </div>
        ) : data ? (
          editMode ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[600px] bg-[#111118] border border-white/[0.08] rounded-2xl px-10 py-10 text-[15px] text-[#f1f1f8] font-mono leading-relaxed resize-y focus:outline-none focus:border-violet-500/50"
              spellCheck={false}
            />
          ) : (
            <article ref={articleRef} className="prose prose-invert max-w-none bg-[#111118] border border-white/[0.08] rounded-2xl px-10 py-10 text-[15px]">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ className, children }) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1];
                    if (lang === 'mermaid') {
                      return <MermaidChart chart={String(children).trim()} />;
                    }
                    if (!className) {
                      return <strong>{children}</strong>;
                    }
                    return <code className={className}>{children}</code>;
                  },
                }}
              >
                {renderedMarkdown}
              </ReactMarkdown>
            </article>
          )
        ) : null}

        {/* 드래그 팝업 */}
        {selectionPopup && (
          <div
            data-selection-popup
            style={{ position: 'absolute', left: selectionPopup.x, top: selectionPopup.y, transform: 'translateX(-50%)' }}
            className="z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#1c1c2a] border border-white/[0.12] shadow-xl"
            onMouseDown={e => e.stopPropagation()}
          >
            {/* 하이라이트 색상 */}
            {HL_COLORS.map(c => (
              <button
                key={c.key}
                title={`${c.label} 하이라이트`}
                onClick={() => handleHighlight(c.key)}
                className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white/50 transition-all hover:scale-110"
                style={{ background: c.bg }}
              />
            ))}
            {/* 구분선 */}
            <div className="w-px h-4 bg-white/[0.12] mx-1" />
            {/* 질문하기 */}
            <button
              onClick={() => handleAskOpen(selectionPopup.text)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-violet-300 hover:text-violet-200 hover:bg-violet-500/20 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              질문
            </button>
          </div>
        )}

        {/* 질문 모달 */}
        {askModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAskModal(null)}>
            <div className="w-full max-w-lg mx-4 bg-[#16161f] border border-white/[0.10] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-[15px] font-bold text-[#f1f1f8]">선택한 내용에 대해 질문</h3>
                <button onClick={() => setAskModal(null)} className="text-[#5a5a78] hover:text-[#9494b0] transition-colors ml-4 flex-shrink-0">✕</button>
              </div>

              <div className="mb-4 px-3 py-2.5 bg-violet-500/10 border border-violet-500/25 rounded-xl text-[12px] text-[#a8a8c4] leading-relaxed">
                "{askModal.selectedText.length > 200 ? askModal.selectedText.slice(0, 200) + '…' : askModal.selectedText}"
              </div>

              <textarea
                autoFocus
                value={askModal.question}
                onChange={e => setAskModal(prev => prev ? { ...prev, question: e.target.value } : prev)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAskSubmit(); }}
                placeholder="질문을 입력하세요... (Ctrl+Enter로 전송)"
                className="w-full h-24 bg-[#0e0e16] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-[#f1f1f8] placeholder-[#3a3a58] resize-none focus:outline-none focus:border-violet-500/50 mb-3"
              />

              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={handleAskSubmit} disabled={askModal.loading || !askModal.question.trim()}>
                  {askModal.loading ? '답변 생성 중...' : '질문하기'}
                </Button>
              </div>

              {(askModal.loading || askModal.answer) && (
                <div className="border-t border-white/[0.06] pt-4">
                  {askModal.loading ? (
                    <div className="flex items-center gap-2 text-[#5a5a78] text-[13px]">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                      답변 생성 중...
                    </div>
                  ) : (
                    <div className="text-[13px] text-[#c4c4e0] leading-relaxed prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{askModal.answer}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
