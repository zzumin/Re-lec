'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidChartProps {
  chart: string;
}

let mermaidInitialized = false;

// 밝은 hex 색상을 어둡게 변환
function darkenHex(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness < 140) return hex; // 이미 어두우면 그대로
  const factor = 0.35;
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
}

function fixSvgColors(svg: string): string {
  // fill="#xxxxxx" 형태의 밝은 색상을 어둡게
  return svg.replace(/fill="(#[0-9a-fA-F]{6})"/g, (_m, hex) => {
    return `fill="${darkenHex(hex)}"`;
  }).replace(/fill:(#[0-9a-fA-F]{6})/g, (_m, hex) => {
    return `fill:${darkenHex(hex)}`;
  });
}

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
              primaryColor: '#5b21b6',
              primaryTextColor: '#ffffff',
              primaryBorderColor: '#a78bfa',
              lineColor: '#a78bfa',
              secondaryColor: '#0e7490',
              secondaryTextColor: '#ffffff',
              secondaryBorderColor: '#22d3ee',
              tertiaryColor: '#065f46',
              tertiaryTextColor: '#ffffff',
              tertiaryBorderColor: '#34d399',
              nodeBorder: '#a78bfa',
              clusterBkg: '#1e1e2a',
              titleColor: '#f1f1f8',
              edgeLabelBackground: '#1e1e2a',
              fontFamily: 'Pretendard Variable, Pretendard, Apple SD Gothic Neo, sans-serif',
              fontSize: '15px',
              cScale0: '#5b21b6', cScale1: '#0e7490', cScale2: '#065f46',
              cScale3: '#9a3412', cScale4: '#1e40af', cScale5: '#831843',
              cScale6: '#3f3f46', cScale7: '#7c3aed', cScale8: '#0f766e',
              cScale9: '#15803d', cScale10: '#b45309', cScale11: '#1d4ed8',
            },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rawSvg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(fixSvgColors(rawSvg));
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
    <div className="my-4 rounded-xl bg-[#0e0e18] border border-violet-500/20 overflow-x-auto p-6 min-h-[300px] flex items-center justify-center">
      <div
        ref={ref}
        style={{ width: '100%', minWidth: 600 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
