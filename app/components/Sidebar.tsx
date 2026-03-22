'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/upload', label: '새 수업 업로드' },
  { href: '/quiz', label: '퀴즈' },
  { href: '/quiz/review', label: '오늘 복습' },
  { href: '/settings', label: '설정 / 과목 관리' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-[#111118] border-r border-white/[0.08] flex flex-col pt-6 pb-6 flex-shrink-0 fixed top-0 left-0 h-screen overflow-y-auto z-10 max-md:-translate-x-full">
      <div className="px-5 pb-6 border-b border-white/[0.08] mb-3">
        <h1 className="text-lg font-extrabold bg-gradient-to-br from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Re:Lec
        </h1>
        <p className="text-[11px] text-[#5a5a78] mt-0.5">리렉처 · Powered by Gemini 2.5 Pro</p>
      </div>

      <nav className="px-3 py-1">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center px-3 py-2.5 rounded-xl text-sm no-underline transition-all duration-200',
              (href === '/' ? pathname === href : pathname.startsWith(href))
                ? 'bg-violet-500/10 text-violet-400'
                : 'text-[#9494b0] hover:bg-white/[0.04] hover:text-[#f1f1f8]'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
