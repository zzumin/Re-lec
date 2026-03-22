import { NextResponse } from 'next/server';
import { getDueCards } from '@/lib/quiz';

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dueCards = getDueCards(today);
    return NextResponse.json(dueCards);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
