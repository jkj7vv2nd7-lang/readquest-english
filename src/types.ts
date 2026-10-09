// ReadQuest English — 共有型定義

export interface WordExample {
  en: string;
  ja: string;
}

export interface WordEntry {
  id: string;
  word: string;
  meanings: string[]; // 日本語の意味（主要なものから順に）
  partOfSpeech: string; // 名詞 / 動詞 / 形容詞 …（日本語表記）
  ipa: string; // 発音記号
  audio?: string | null; // 音声ファイルURL（任意。未設定時はTTSを使用）
  examples: WordExample[];
  level: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  collocations: string[];
  source: string; // 自作など
  license: string;
}

export type GameKind = 'hunter' | 'spell' | 'listening' | 'match';

export interface GameResult {
  id: string;
  date: string; // ISO
  game: GameKind | 'study' | 'reading' | 'review';
  wordId?: string;
  readingId?: string;
  correct: boolean;
  answer?: string;
}

export interface WordStats {
  shown: number;
  correct: number;
  wrong: number;
  lastResult?: boolean;
  lastStudied?: string;
  nextReview?: string; // ISO（復習予定日）
  intervalDays: number; // 簡易SRSの間隔
}

/** 設問の種類（省略時は detail）。上級では gist / inference / intent を使う */
export type QuestionKind = 'detail' | 'gist' | 'inference' | 'intent' | 'vocab';

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  detail: '内容理解',
  gist: '要旨',
  inference: '推論',
  intent: '筆者の意図',
  vocab: '語彙',
};

export interface ReadingQuestion {
  q: string;
  choices: string[];
  answer: number; // 正解インデックス
  explanation: string;
  kind?: QuestionKind;
}

export interface ReadingEntry {
  id: string;
  title: string;
  titleJa: string;
  level: 1 | 2 | 3 | 4 | 5;
  body: string[]; // 段落配列（英語）
  bodyJa: string[]; // 対応する日本語訳
  vocab: { word: string; meaning: string }[];
  questions: ReadingQuestion[];
  source: string;
  license: string;
}

export interface ProgressState {
  version: 1;
  dailyGoal: number; // 1日の目標問題数
  level: number; // 学習レベル 1-5
  fontSize: 'small' | 'medium' | 'large';
  results: GameResult[];
  wordStats: Record<string, WordStats>;
  studyDays: Record<string, number>; // YYYY-MM-DD -> 学習数
  lastWordId?: string;
  reviewHistory: { date: string; wordId: string; correct: boolean }[];
  createdAt: string;
}

export const LEVEL_LABEL: Record<number, string> = {
  1: '入門（中学基礎）',
  2: '初級（中学〜高校）',
  3: '中級（高校）',
  4: '中上級（大学・TOEIC）',
  5: '上級（洋書・新聞）',
};
