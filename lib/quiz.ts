import fs from 'fs';
import path from 'path';
import { ensureDir } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = '단답형' | 'OX' | '빈칸채우기' | '서술형';

export interface SM2State {
  interval: number;    // days until next review
  repetition: number;  // times reviewed with grade >= 3
  efactor: number;     // ease factor (min 1.3, default 2.5)
  dueDate: string;     // YYYY-MM-DD
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string;
  hint?: string;        // 빈칸채우기: fill context; others: optional hint
  explanation?: string; // shown after revealing answer
  sm2: SM2State;
}

export interface QuizSet {
  id: string;
  semester: string;
  subject: string;
  sourceSessions: string[];
  createdAt: string;
  title: string;
  questions: QuizQuestion[];
}

// ─── SM-2 Algorithm ───────────────────────────────────────────────────────────

/**
 * Apply one SM-2 review cycle.
 * grade: 0=전혀 모름, 1=틀림, 2=힌트 후 맞음, 3=어렵게 맞음, 4=맞음, 5=완벽
 */
export function applySM2(state: SM2State, grade: 0 | 1 | 2 | 3 | 4 | 5): SM2State {
  let { interval, repetition, efactor } = state;

  if (grade >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * efactor);
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    interval,
    repetition,
    efactor: parseFloat(efactor.toFixed(4)),
    dueDate: due.toISOString().slice(0, 10),
  };
}

export function initialSM2(): SM2State {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    interval: 1,
    repetition: 0,
    efactor: 2.5,
    dueDate: tomorrow.toISOString().slice(0, 10),
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const QUIZ_DIR = path.join(process.cwd(), 'data', '_quizzes');

function ensureQuizDir() {
  ensureDir(QUIZ_DIR);
}

export function saveQuizSet(quizSet: QuizSet): void {
  ensureQuizDir();
  fs.writeFileSync(
    path.join(QUIZ_DIR, `${quizSet.id}.json`),
    JSON.stringify(quizSet, null, 2),
    'utf-8'
  );
}

export function getQuizSet(id: string): QuizSet | null {
  const file = path.join(QUIZ_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function listQuizSets(): QuizSet[] {
  ensureQuizDir();
  return fs
    .readdirSync(QUIZ_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8')) as QuizSet)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateQuizQuestion(
  quizId: string,
  questionId: string,
  sm2: SM2State
): void {
  const quizSet = getQuizSet(quizId);
  if (!quizSet) return;
  quizSet.questions = quizSet.questions.map(q =>
    q.id === questionId ? { ...q, sm2 } : q
  );
  saveQuizSet(quizSet);
}

export function getDueCards(today: string): Array<{
  quizId: string;
  quizTitle: string;
  question: QuizQuestion;
}> {
  ensureQuizDir();
  const result: Array<{ quizId: string; quizTitle: string; question: QuizQuestion }> = [];
  for (const quizSet of listQuizSets()) {
    for (const question of quizSet.questions) {
      if (question.sm2.dueDate <= today) {
        result.push({ quizId: quizSet.id, quizTitle: quizSet.title, question });
      }
    }
  }
  return result;
}
