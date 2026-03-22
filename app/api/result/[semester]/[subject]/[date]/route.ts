import { NextRequest, NextResponse } from 'next/server';
import { getResult, getSubjectInfo } from '@/lib/storage';

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
