import mammoth from 'mammoth';
import JSZip from 'jszip';

function stripRtf(buffer: Buffer): string {
  // RTF files may use various encodings; try utf8 then latin1
  const raw = buffer.toString('utf8');
  // Remove destination groups like {\*\generator ...}
  let text = raw.replace(/\{\\[*][^}]*\}/g, '');
  // Remove control words: \word or \word123
  text = text.replace(/\\[a-z]+\-?\d*\n?/gi, ' ');
  // Remove escaped hex chars \'xx
  text = text.replace(/\\\'[0-9a-f]{2}/gi, ' ');
  // Remove remaining control symbols \X
  text = text.replace(/\\./g, ' ');
  // Remove curly braces
  text = text.replace(/[{}]/g, '');
  return text.replace(/\s+/g, ' ').trim();
}

export async function parseDocFile(buffer: Buffer, filename?: string): Promise<string> {
  const b0 = buffer[0], b1 = buffer[1];

  // DOCX / ZIP: PK magic (0x50 0x4B)
  if (b0 === 0x50 && b1 === 0x4B) {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value.trim()) return result.value;
  }

  // OLE binary .doc: 0xD0 0xCF magic
  if (b0 === 0xD0 && b1 === 0xCF) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const text = doc.getBody();
    if (text.trim()) return text;
  }

  // RTF: starts with {\rtf
  const head = buffer.slice(0, 6).toString('utf8');
  if (head.startsWith('{\\rtf')) {
    const text = stripRtf(buffer);
    if (text.trim()) return text;
  }

  // HTML file disguised as .doc (common with Korean transcription apps)
  if (head.startsWith('<h') || head.startsWith('<H') || head.toLowerCase().startsWith('<!do')) {
    const html = buffer.toString('utf8');
    // Strip tags and decode common HTML entities
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text) return text;
  }

  // Last resort: try mammoth (handles edge cases like DOCX mislabeled)
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value.trim()) return result.value;
  } catch { /* ignore */ }

  throw new Error(
    `문서 파싱에 실패했습니다 (magic: ${b0.toString(16).padStart(2,'0')}${b1.toString(16).padStart(2,'0')}). ` +
    '.docx 형식으로 변환 후 업로드해보세요.'
  );
}

export async function parsePdfFile(buffer: Buffer): Promise<string> {
  // pdf-parse v2 API: new PDFParse({ data: buffer }).getText()
  // require() inside function body to avoid Turbopack static analysis issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

export async function parsePptxFile(buffer: Buffer): Promise<string> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return 'PPTX 파싱 실패: 파일이 손상되었거나 지원되지 않는 형식입니다. PDF로 변환 후 업로드해주세요.';
  }

  const slideFiles = Object.keys(zip.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return na - nb;
    });

  const texts: string[] = [];
  let slideNum = 1;
  for (const slideFile of slideFiles) {
    try {
      const xml = await zip.files[slideFile].async('string');
      const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      const slideText = textMatches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .filter(t => t.trim())
        .join(' ');
      if (slideText.trim()) {
        texts.push(`[슬라이드 ${slideNum}]\n${slideText}`);
      }
    } catch {
      // skip unreadable slides
    }
    slideNum++;
  }

  if (texts.length === 0) {
    return 'PPTX에서 텍스트를 추출하지 못했습니다. 슬라이드에 텍스트 레이어가 없거나 이미지로만 구성된 경우입니다.';
  }
  return texts.join('\n\n');
}

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return parseDocFile(buffer, filename);
  } else if (lower.endsWith('.pdf')) {
    return parsePdfFile(buffer);
  } else if (lower.endsWith('.pptx')) {
    return parsePptxFile(buffer);
  } else if (lower.endsWith('.ppt')) {
    try {
      return await parsePdfFile(buffer);
    } catch {
      return '.ppt (구형 바이너리) 형식은 직접 지원되지 않습니다. .pptx 또는 .pdf로 변환 후 업로드해주세요.';
    }
  }
  throw new Error(`지원하지 않는 파일 형식: ${filename}`);
}
