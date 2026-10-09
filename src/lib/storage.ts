// 学習進捗の保存・復元（localStorage）。不正データ・保存失敗に耐える設計。
import type { GameResult, ProgressState, WordStats } from '../types';

export const STORAGE_KEY = 'readquest-progress-v1';

export function defaultProgress(): ProgressState {
  return {
    version: 1,
    dailyGoal: 10,
    level: 2,
    fontSize: 'medium',
    results: [],
    wordStats: {},
    studyDays: {},
    reviewHistory: [],
    createdAt: new Date().toISOString(),
  };
}

function isValidProgress(v: unknown): v is ProgressState {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.version === 1 &&
    typeof o.dailyGoal === 'number' &&
    typeof o.level === 'number' &&
    Array.isArray(o.results) &&
    typeof o.wordStats === 'object' && o.wordStats !== null &&
    typeof o.studyDays === 'object' && o.studyDays !== null
  );
}

export function loadProgress(): { state: ProgressState; corrupted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: defaultProgress(), corrupted: false };
    const parsed: unknown = JSON.parse(raw);
    if (isValidProgress(parsed)) return { state: parsed, corrupted: false };
    return { state: defaultProgress(), corrupted: true };
  } catch {
    return { state: defaultProgress(), corrupted: true };
  }
}

export function saveProgress(state: ProgressState): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存に失敗しました' };
  }
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function todayKey(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 学習結果を記録し、簡易SRS（正解で間隔を伸ばし、不正解で1日に戻す）を更新する */
export function recordResult(
  prev: ProgressState,
  r: Omit<GameResult, 'id' | 'date'>,
): ProgressState {
  const date = new Date().toISOString();
  const result: GameResult = { ...r, id: `r${Date.now()}${Math.floor(Math.random() * 1000)}`, date };
  const wordStats: Record<string, WordStats> = { ...prev.wordStats };
  if (r.wordId) {
    // H1修正：既存オブジェクトを直接書き換えない（前状態へのエイリアス防止）
    const prevStat: WordStats = wordStats[r.wordId] ?? { shown: 0, correct: 0, wrong: 0, intervalDays: 1 };
    const s: WordStats = { ...prevStat };
    s.shown += 1;
    if (r.correct) {
      s.correct += 1;
      s.lastResult = true;
      s.intervalDays = Math.min(30, s.intervalDays === 1 && s.correct <= 1 ? 1 : Math.max(2, s.intervalDays * 2));
    } else {
      s.wrong += 1;
      s.lastResult = false;
      s.intervalDays = 1;
    }
    s.lastStudied = date;
    const next = new Date();
    next.setDate(next.getDate() + s.intervalDays);
    s.nextReview = next.toISOString();
    wordStats[r.wordId] = s;
  }
  const studyDays = { ...prev.studyDays };
  const key = todayKey();
  studyDays[key] = (studyDays[key] ?? 0) + 1;
  const reviewHistory = r.wordId
    ? [...prev.reviewHistory, { date, wordId: r.wordId, correct: r.correct }].slice(-500)
    : prev.reviewHistory;
  return {
    ...prev,
    results: [...prev.results, result].slice(-1000),
    wordStats,
    studyDays,
    reviewHistory,
    lastWordId: r.wordId ?? prev.lastWordId,
  };
}

/** 復習対象の抽出：①間違えた単語 ②期限到来 ③未学習 を優先度順に */
export function dueWords(state: ProgressState, allIds: string[], now = new Date(), limit = 20): string[] {
  const scored: { id: string; score: number }[] = [];
  for (const id of allIds) {
    const s = state.wordStats[id];
    if (!s) {
      scored.push({ id, score: 30 }); // 未学習
      continue;
    }
    if (s.wrong > 0 && s.lastResult === false) {
      scored.push({ id, score: 100 + s.wrong * 10 }); // 直近不正解を最優先
      continue;
    }
    const next = s.nextReview ? new Date(s.nextReview).getTime() : 0;
    if (next <= now.getTime()) {
      const accuracy = s.shown > 0 ? s.correct / s.shown : 1;
      scored.push({ id, score: 60 + (1 - accuracy) * 40 });
      continue;
    }
    if (s.wrong > s.correct) scored.push({ id, score: 50 });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.id);
}

export function accuracy(state: ProgressState): number {
  if (state.results.length === 0) return 0;
  const c = state.results.filter((r) => r.correct).length;
  return Math.round((c / state.results.length) * 100);
}

export function studyDayCount(state: ProgressState): number {
  return Object.keys(state.studyDays).length;
}

export function todayCount(state: ProgressState): number {
  return state.studyDays[todayKey()] ?? 0;
}
