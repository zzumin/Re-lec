import { NextRequest, NextResponse } from 'next/server';
import { askAboutSelection } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { question, selectedText, noteContext } = await request.json();
    if (!question || !selectedText || !noteContext) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    }
    const answer = await askAboutSelection(question, selectedText, noteContext);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
