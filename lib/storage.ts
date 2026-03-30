import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface SessionMeta {
  date: string;
  subject: string;
  semester: string;
  professor: string;
  slideCount?: number;
  createdAt: string;
  title?: string;
}

export interface SubjectData {
  professor: string;
  styleNotes: string[];
  sessions: string[];
  updatedAt: string;
}

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getSubjectDir(semester: string, subject: string): string {
  return path.join(DATA_DIR, semester, subject);
}

export function getSessionDir(semester: string, subject: string, date: string): string {
  return path.join(DATA_DIR, semester, subject, date);
}

export function saveSession(
  semester: string,
  subject: string,
  date: string,
  meta: SessionMeta,
  transcription: string,
  result: string
) {
  const sessionDir = getSessionDir(semester, subject, date);
  ensureDir(sessionDir);
  fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  fs.writeFileSync(path.join(sessionDir, 'transcription.txt'), transcription, 'utf-8');
  fs.writeFileSync(path.join(sessionDir, 'result.md'), result, 'utf-8');
}

export function saveStyleUpdate(
  semester: string,
  subject: string,
  professor: string,
  date: string,
  newStyleNote: string
) {
  const subjectDir = getSubjectDir(semester, subject);
  ensureDir(subjectDir);
  const subjectFile = path.join(subjectDir, 'subject.json');

  let data: SubjectData = {
    professor,
    styleNotes: [],
    sessions: [],
    updatedAt: new Date().toISOString(),
  };

  if (fs.existsSync(subjectFile)) {
    data = JSON.parse(fs.readFileSync(subjectFile, 'utf-8'));
  }

  if (!data.sessions.includes(date)) {
    data.sessions.push(date);
  }
  // Replace with latest cumulative analysis (not append)
  if (newStyleNote) {
    data.styleNotes = [newStyleNote];
  }
  data.professor = professor;
  data.updatedAt = new Date().toISOString();

  fs.writeFileSync(subjectFile, JSON.stringify(data, null, 2), 'utf-8');
}

export function listSubjects(): Record<string, Record<string, SubjectData>> {
  const result: Record<string, Record<string, SubjectData>> = {};
  if (!fs.existsSync(DATA_DIR)) return result;

  const semesters = fs.readdirSync(DATA_DIR).filter(s =>
    !s.startsWith('_') && fs.statSync(path.join(DATA_DIR, s)).isDirectory()
  );

  for (const semester of semesters) {
    result[semester] = {};
    const semesterDir = path.join(DATA_DIR, semester);
    const subjects = fs.readdirSync(semesterDir).filter(s =>
      fs.statSync(path.join(semesterDir, s)).isDirectory()
    );
    for (const subject of subjects) {
      const subjectFile = path.join(semesterDir, subject, 'subject.json');
      if (fs.existsSync(subjectFile)) {
        result[semester][subject] = JSON.parse(fs.readFileSync(subjectFile, 'utf-8'));
      }
    }
  }
  return result;
}

export function getResult(semester: string, subject: string, date: string): string | null {
  const resultFile = path.join(getSessionDir(semester, subject, date), 'result.md');
  if (!fs.existsSync(resultFile)) return null;
  return fs.readFileSync(resultFile, 'utf-8');
}

export function getSubjectInfo(semester: string, subject: string): SubjectData | null {
  const subjectFile = path.join(getSubjectDir(semester, subject), 'subject.json');
  if (!fs.existsSync(subjectFile)) return null;
  return JSON.parse(fs.readFileSync(subjectFile, 'utf-8'));
}

export function getSessionMeta(semester: string, subject: string, date: string): SessionMeta | null {
  const metaFile = path.join(getSessionDir(semester, subject, date), 'meta.json');
  if (!fs.existsSync(metaFile)) return null;
  return JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
}

export function saveSessionTitle(
  semester: string,
  subject: string,
  date: string,
  title: string
) {
  const metaFile = path.join(getSessionDir(semester, subject, date), 'meta.json');
  if (!fs.existsSync(metaFile)) return;
  const meta: SessionMeta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
  meta.title = title;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * 현재 날짜 이전의 수업 결과를 시간순으로 반환합니다.
 * @param maxSessions 최대 가져올 수업 수 (기본 4개)
 */
export interface Highlight {
  id: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: string;
}

export function getHighlights(semester: string, subject: string, date: string): Highlight[] {
  const file = path.join(getSessionDir(semester, subject, date), 'highlights.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function saveHighlights(semester: string, subject: string, date: string, highlights: Highlight[]): void {
  const file = path.join(getSessionDir(semester, subject, date), 'highlights.json');
  fs.writeFileSync(file, JSON.stringify(highlights, null, 2), 'utf-8');
}

export function saveResult(semester: string, subject: string, date: string, result: string): void {
  const resultFile = path.join(getSessionDir(semester, subject, date), 'result.md');
  fs.writeFileSync(resultFile, result, 'utf-8');
}

function rmrf(dir: string): void {
  execSync(`rm -rf "${dir.replace(/\\/g, '/')}"`, { shell: 'bash' });
}

export function deleteSubject(semester: string, subject: string): void {
  const dir = getSubjectDir(semester, subject);
  if (fs.existsSync(dir)) {
    rmrf(dir);
  }
  // 학기 디렉토리가 비면 학기도 삭제
  try {
    const semesterDir = path.join(DATA_DIR, semester);
    if (fs.existsSync(semesterDir) && fs.readdirSync(semesterDir).length === 0) {
      rmrf(semesterDir);
    }
  } catch {
    // 학기 디렉토리 삭제 실패는 무시
  }
}

export function deleteSession(semester: string, subject: string, date: string): void {
  const dir = getSessionDir(semester, subject, date);
  if (fs.existsSync(dir)) {
    rmrf(dir);
  }
  // subject.json에서 session 날짜 제거
  const subjectFile = path.join(getSubjectDir(semester, subject), 'subject.json');
  if (fs.existsSync(subjectFile)) {
    const data: SubjectData = JSON.parse(fs.readFileSync(subjectFile, 'utf-8'));
    data.sessions = data.sessions.filter(d => d !== date);
    fs.writeFileSync(subjectFile, JSON.stringify(data, null, 2), 'utf-8');
  }
}

export function getPreviousSessions(
  semester: string,
  subject: string,
  currentDate: string,
  maxSessions: number = 4
): Array<{ date: string; result: string }> {
  const subjectInfo = getSubjectInfo(semester, subject);
  if (!subjectInfo) return [];

  const previousDates = subjectInfo.sessions
    .filter(d => d < currentDate)
    .sort()
    .reverse()
    .slice(0, maxSessions)
    .reverse(); // 시간순(오래된 것 → 최신 것)

  return previousDates
    .map(date => {
      const result = getResult(semester, subject, date);
      return result ? { date, result } : null;
    })
    .filter((s): s is { date: string; result: string } => s !== null);
}
