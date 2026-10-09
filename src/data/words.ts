// 単語データ集約 — 追加時は wordsN.ts を増やしてここに結合する
import type { WordEntry } from '../types';
import { WORDS_1 } from './words1';
import { WORDS_2 } from './words2';
import { WORDS_3 } from './words3';
import { WORDS_4 } from './words4';
import { WORDS_5 } from './words5';
import { WORDS_6 } from './words6';

export const WORDS: WordEntry[] = [...WORDS_1, ...WORDS_2, ...WORDS_3, ...WORDS_4, ...WORDS_5, ...WORDS_6].map((w) => ({
  ...w,
  word: w.word.trim(),
}));

export const WORD_MAP: Map<string, WordEntry> = new Map(WORDS.map((w) => [w.id, w]));

export function wordsByLevel(level: number): WordEntry[] {
  return WORDS.filter((w) => w.level <= level);
}

export function getWord(id: string): WordEntry | undefined {
  return WORD_MAP.get(id);
}
