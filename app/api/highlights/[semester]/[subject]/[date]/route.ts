import { NextRequest, NextResponse } from 'next/server';
import { getHighlights, saveHighlights, Highlight } from '@/lib/storage';
import { randomUUID } from 'crypto';

type Params = Promise<{ semester: string; subject: string; date: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { semester, subject, date } = await params;
  return NextResponse.json(getHighlights(
    decodeURIComponent(semester),
    decodeURIComponent(subject),
    decodeURIComponent(date)
  ));
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { semester, subject, date } = await params;
  const { text, color } = await req.json();
  if (!text || !color) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });

  const s = decodeURIComponent(semester);
  const sub = decodeURIComponent(subject);
  const d = decodeURIComponent(date);

  const highlights = getHighlights(s, sub, d);
  const newHighlight: Highlight = { id: randomUUID(), text, color, createdAt: new Date().toISOString() };
  highlights.push(newHighlight);
  saveHighlights(s, sub, d, highlights);
  return NextResponse.json(newHighlight);
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { semester, subject, date } = await params;
  const { id } = await req.json();

  const s = decodeURIComponent(semester);
  const sub = decodeURIComponent(subject);
  const d = decodeURIComponent(date);

  const highlights = getHighlights(s, sub, d).filter(h => h.id !== id);
  saveHighlights(s, sub, d, highlights);
  return NextResponse.json({ success: true });
}
