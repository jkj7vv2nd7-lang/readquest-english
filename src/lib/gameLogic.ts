// ゲーム・採点の純粋ロジック（UI非依存・テスト対象）
import type { ReadingEntry, WordEntry } from '../types';

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 配列から重複なしで n 件選ぶ。不足時はある分だけ返す（クラッシュ防止） */
export function pick<T>(arr: T[], n: number, rand: () => number = Math.random): T[] {
  if (arr.length <= n) return shuffle(arr, rand);
  return shuffle(arr, rand).slice(0, n);
}

export interface HunterQuestion {
  word: WordEntry;
  choices: string[]; // 日本語の意味
  answerIndex: number;
}

/** 意味ハンター：正解＋ダミー3件。単語不足時は choices が減る */
export function makeHunterQuestion(
  target: WordEntry,
  pool: WordEntry[],
  rand: () => number = Math.random,
): HunterQuestion | null {
  if (!target) return null;
  const correct = target.meanings[0] ?? target.word;
  const dummies = shuffle(
    pool.filter((w) => w.id !== target.id).map((w) => w.meanings[0] ?? w.word),
    rand,
  ).filter((m) => m !== correct);
  const choices = shuffle([correct, ...dummies.slice(0, 3)], rand);
  return { word: target, choices, answerIndex: choices.indexOf(correct) };
}

export function judgeHunter(q: HunterQuestion, chosen: number): boolean {
  return chosen === q.answerIndex;
}

/** スペル工房：大小・前後空白を無視して判定 */
export function judgeSpelling(word: WordEntry, input: string): boolean {
  return word.word.trim().toLowerCase() === input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface MatchPairs {
  left: { id: string; text: string }[]; // 英単語
  right: { id: string; text: string }[]; // 意味（シャッフル済み）
}

/** ペアマッチ：最大4ペア。2件未満では成立しない。右側の意味テキストは重複排除 */
export function makeMatchPairs(words: WordEntry[], rand: () => number = Math.random): MatchPairs | null {
  const shuffled = shuffle(words, rand);
  const targets: WordEntry[] = [];
  const seenMeanings = new Set<string>();
  for (const w of shuffled) {
    if (targets.length >= 4) break;
    const m = (w.meanings[0] ?? '').trim();
    if (!m || seenMeanings.has(m)) continue; // M1修正：同文言の選択肢が並ぶ曖昧さを排除
    seenMeanings.add(m);
    targets.push(w);
  }
  if (targets.length < 2) return null;
  return {
    left: targets.map((w) => ({ id: w.id, text: w.word })),
    right: shuffle(targets.map((w) => ({ id: w.id, text: w.meanings[0] ?? '' })), rand),
  };
}

export function judgeMatch(pairs: MatchPairs, leftId: string, rightId: string): boolean {
  return leftId === rightId && pairs.left.some((l) => l.id === leftId);
}

/** リーディング採点 */
export function gradeReading(entry: ReadingEntry, answers: number[]): { score: number; total: number } {
  let score = 0;
  entry.questions.forEach((q, i) => {
    if (answers[i] === q.answer) score += 1;
  });
  return { score, total: entry.questions.length };
}
