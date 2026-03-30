import { NextRequest, NextResponse } from 'next/server';
import { getResult, getSubjectInfo, saveResult } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ semester: string; subject: string; date: string }> }
) {
  try {
    const { semester, subject, date } = await params;
    const result = getResult(
      decodeURIComponent(semester),
      decodeURIComponent(subject),
      decodeURIComponent(date)
    );
    if (!result) {
      return NextResponse.json({ error: '결과를 찾을 수 없습니다.' }, { status: 404 });
    }
    const styleInfo = getSubjectInfo(
      decodeURIComponent(semester),
      decodeURIComponent(subject)
    );
    return NextResponse.json({ result, styleInfo });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ semester: string; subject: string; date: string }> }
) {
  try {
    const { semester, subject, date } = await params;
    const { result } = await request.json();
    if (typeof result !== 'string') {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
    }
    saveResult(
      decodeURIComponent(semester),
      decodeURIComponent(subject),
      decodeURIComponent(date),
      result
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
