'use client';

import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    fetch(`/api/result/${encodeURIComponent(semester)}/${encodeURIComponent(subject)}/${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [semester, subject, date]);

  const articleRef = useRef<HTMLElement>(null);

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

    // Temporarily apply light-mode styles for clean PDF output
    const prev = el.getAttribute('style') || '';
    el.style.background = '#fff';
    el.style.color = '#1a1a1a';
    el.style.border = 'none';
    el.style.borderRadius = '0';
    el.style.padding = '0';

    // Override heading/link colors to dark equivalents for white background
    const styleTag = document.createElement('style');
    styleTag.id = '__pdf-override';
    styleTag.textContent = `
      article.prose h2 { color: #6d28d9 !important; }
      article.prose h3 { color: #0e7490 !important; }
      article.prose a, article.prose [style*="color"] { color: #6d28d9 !important; }
      article.prose strong { color: #111 !important; }
      article.prose p, article.prose li { color: #1a1a1a !important; }
      article.prose code { background: #f0f4ff !important; color: #0055aa !important; border-color: #c4c4e0 !important; }
    `;
    document.head.appendChild(styleTag);

    const opt = {
      margin: [14, 16, 14, 16] as [number, number, number, number],
      filename: `${subject}-${date}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    try {
      await html2pdf().set(opt).from(el).save();
    } finally {
      el.setAttribute('style', prev);
      document.getElementById('__pdf-override')?.remove();
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen p-8 max-md:ml-0 max-md:p-5">
        {/* Print-only header */}
        <div className="print-header">
          <div style={{ fontSize: '11pt', color: '#555', marginBottom: 4 }}>{semester} · {subject}</div>
          <div style={{ fontSize: '18pt', fontWeight: 700, color: '#111' }}>강의 해설 — {date}</div>
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
          <span className="text-[#9494b0]">{date}</span>
        </div>

        {/* Header */}
        <div className="no-print flex items-start justify-between mb-6">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="semester">{semester}</Badge>
              <Badge variant="cyan">{subject}</Badge>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#f1f1f8]">강의 해설 — {date}</h1>
            {data?.styleInfo && (
              <p className="text-[13px] text-[#5a5a78] mt-1">{data.styleInfo.professor}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {data?.styleInfo?.styleNotes?.length ? (
              <Button variant="secondary" size="sm" onClick={() => setShowStyle(!showStyle)}>
                스타일 분석
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? '복사됨' : '복사'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePdf}>
              PDF 저장
            </Button>
          </div>
        </div>

        {/* Style panel (collapsible) */}
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
          <article ref={articleRef} className="prose prose-invert max-w-none bg-[#111118] border border-white/[0.08] rounded-2xl px-10 py-10 text-[15px]">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ className, children }) {
                  const lang = /language-(\w+)/.exec(className || '')?.[1];
                  if (lang === 'mermaid') {
                    return <MermaidChart chart={String(children).trim()} />;
                  }
                  return <code className={className}>{children}</code>;
                },
              }}
            >
              {data.result}
            </ReactMarkdown>
          </article>
        ) : null}
      </main>
    </div>
  );
}
