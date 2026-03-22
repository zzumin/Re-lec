'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidChartProps {
  chart: string;
}

let mermaidInitialized = false;

export default function MermaidChart({ chart }: MermaidChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              darkMode: true,
              background: '#111118',
              primaryColor: '#8b5cf6',
              primaryTextColor: '#f1f1f8',
              primaryBorderColor: 'rgba(139,92,246,0.4)',
              lineColor: '#5a5a78',
              secondaryColor: '#16161f',
              tertiaryColor: '#1e1e2a',
              nodeBorder: 'rgba(255,255,255,0.08)',
              clusterBkg: '#16161f',
              titleColor: '#f1f1f8',
              edgeLabelBackground: '#111118',
              fontFamily: 'Pretendard Variable, Pretendard, Apple SD Gothic Neo, sans-serif',
              fontSize: '14px',
            },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-[#fca5a5] text-xs font-mono">
        다이어그램 렌더링 오류: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center gap-2 text-[#5a5a78] text-sm py-4">
        <div className="w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        다이어그램 렌더링 중...
      </div>
    );
  }

  return (
    <div className="my-2 rounded-xl bg-[#0e0e18] border border-violet-500/20 overflow-x-auto p-4 min-h-[140px] flex items-center justify-center">
      <div
        ref={ref}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
