import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_FILE = path.join(process.cwd(), '.env.local');

// GET: check if API key is set
export async function GET() {
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  return NextResponse.json({ hasKey, masked: hasKey ? '••••••••' + process.env.GEMINI_API_KEY?.slice(-4) : '' });
}

// POST: save API key to .env.local (requires app restart)
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey || !apiKey.startsWith('AI')) {
      return NextResponse.json({ error: 'Google Gemini API key는 "AI"로 시작해야 합니다.' }, { status: 400 });
    }

    let content = '';
    if (fs.existsSync(ENV_FILE)) {
      content = fs.readFileSync(ENV_FILE, 'utf-8');
      content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${apiKey}`);
      if (!content.includes('GEMINI_API_KEY=')) {
        content += `\nGEMINI_API_KEY=${apiKey}\n`;
      }
    } else {
      content = `GEMINI_API_KEY=${apiKey}\n`;
    }
    fs.writeFileSync(ENV_FILE, content, 'utf-8');

    return NextResponse.json({ success: true, message: 'API key 저장 완료. 앱을 재시작하면 적용됩니다.' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
