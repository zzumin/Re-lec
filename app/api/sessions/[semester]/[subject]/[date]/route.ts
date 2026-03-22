import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionDir } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ semester: string; subject: string; date: string }> }
) {
  const { semester, subject, date } = await params;
  const metaFile = path.join(
    getSessionDir(decodeURIComponent(semester), decodeURIComponent(subject), decodeURIComponent(date)),
    'meta.json'
  );
  if (!fs.existsSync(metaFile)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
  return NextResponse.json({ title: meta.title ?? null });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ semester: string; subject: string; date: string }> }
) {
  try {
    const { semester, subject, date } = await params;
    const { title } = await request.json();
    const metaFile = path.join(
      getSessionDir(decodeURIComponent(semester), decodeURIComponent(subject), decodeURIComponent(date)),
      'meta.json'
    );
    if (!fs.existsSync(metaFile)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    meta.title = title;
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
