import { describe, expect, it, beforeEach } from 'vitest';

// node 環境用の最小 localStorage ポリフィル
if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

import {
  accuracy,
  defaultProgress,
  dueWords,
  loadProgress,
  recordResult,
  saveProgress,
  STORAGE_KEY,
  todayKey,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('初回は空の進捗を返す', () => {
    const { state, corrupted } = loadProgress();
    expect(corrupted).toBe(false);
    expect(state.results).toEqual([]);
  });
  it('不正JSON・不正形式では初期化＋corrupted', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    expect(loadProgress().corrupted).toBe(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    expect(loadProgress().corrupted).toBe(true);
  });
  it('保存と再読み込みが一致する', () => {
    const s = defaultProgress();
    s.dailyGoal = 20;
    expect(saveProgress(s).ok).toBe(true);
    expect(loadProgress().state.dailyGoal).toBe(20);
  });
});

describe('recordResult / SRS', () => {
  it('正解で記録が増え、不正解で interval が1日に戻る', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'hunter', wordId: 'w001', correct: false });
    expect(s.wordStats['w001'].wrong).toBe(1);
    expect(s.wordStats['w001'].intervalDays).toBe(1);
    s = recordResult(s, { game: 'hunter', wordId: 'w001', correct: true });
    s = recordResult(s, { game: 'hunter', wordId: 'w001', correct: true });
    expect(s.wordStats['w001'].correct).toBe(2);
    expect(s.wordStats['w001'].intervalDays).toBeGreaterThan(1);
    expect(s.studyDays[Object.keys(s.studyDays)[0]]).toBeGreaterThanOrEqual(3);
  });
  it('前状態のWordStatsオブジェクトを書き換えない（不変性）', () => {
    const before = defaultProgress();
    const after = recordResult(before, { game: 'hunter', wordId: 'w001', correct: true });
    expect(before.wordStats['w001']).toBeUndefined();
    const after2 = recordResult(after, { game: 'hunter', wordId: 'w001', correct: true });
    expect(after.wordStats['w001'].shown).toBe(1);
    expect(after2.wordStats['w001'].shown).toBe(2);
  });
  it('連続正解で間隔が倍増し上限30日で頭打ちになる', () => {
    let s = defaultProgress();
    for (let i = 0; i < 10; i++) s = recordResult(s, { game: 'hunter', wordId: 'w010', correct: true });
    expect(s.wordStats['w010'].intervalDays).toBe(30);
  });
  it('誤答後は復習予定が翌日になる', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'hunter', wordId: 'w011', correct: true });
    s = recordResult(s, { game: 'hunter', wordId: 'w011', correct: false });
    const next = new Date(s.wordStats['w011'].nextReview!);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(next.toDateString()).toBe(tomorrow.toDateString());
  });
  it('日付が変わると別のstudyDaysキーに記録される', () => {
    expect(todayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(todayKey(new Date(2026, 0, 2))).toBe('2026-01-02');
    expect(todayKey(new Date(2026, 0, 1))).not.toBe(todayKey(new Date(2026, 0, 2)));
  });
  it('未回答（wordIdなし）でも日次カウントと結果は増える', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'reading', readingId: 'r1', correct: true });
    expect(Object.keys(s.wordStats).length).toBe(0);
    expect(s.results.length).toBe(1);
    expect(s.studyDays[todayKey()]).toBe(1);
  });
  it('旧バージョンの保存データ形式（最小v1）と互換性がある', () => {
    const legacy = { version: 1, dailyGoal: 10, level: 2, results: [], wordStats: {}, studyDays: {} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const { state, corrupted } = loadProgress();
    expect(corrupted).toBe(false);
    expect(state.dailyGoal).toBe(10);
  });
  it('正答率計算', () => {
    let s = defaultProgress();
    expect(accuracy(s)).toBe(0);
    s = recordResult(s, { game: 'hunter', wordId: 'a', correct: true });
    s = recordResult(s, { game: 'hunter', wordId: 'b', correct: false });
    expect(accuracy(s)).toBe(50);
  });
});

describe('dueWords', () => {
  it('直近不正解を最優先し、上限を守る', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'hunter', wordId: 'w002', correct: false });
    const due = dueWords(s, ['w001', 'w002', 'w003'], new Date(), 2);
    expect(due[0]).toBe('w002');
    expect(due.length).toBeLessThanOrEqual(2);
  });
  it('未学習を含む全件抽出でも落ちない', () => {
    const s = defaultProgress();
    expect(dueWords(s, [], new Date())).toEqual([]);
    expect(dueWords(s, ['x'], new Date())).toEqual(['x']);
  });
});
