// 利用フローの統合テスト（ロジック層）。
// 実ブラウザのE2Eではない。UI操作（連打ロック等）はコード確認＋単体テストで担保し、
// ここでは「記録→集計→復習→保存→復元」の一貫性を検証する。
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
  clearProgress,
  defaultProgress,
  dueWords,
  loadProgress,
  recordResult,
  saveProgress,
  STORAGE_KEY,
  studyDayCount,
  todayCount,
  todayKey,
} from './lib/storage';
import { WORDS } from './data/words';
import { READINGS } from './data/readings';
import { gradeReading, judgeHunter, makeHunterQuestion } from './lib/gameLogic';

beforeEach(() => {
  localStorage.clear();
});

describe('フロー1: 学習→記録→統計の一貫性', () => {
  it('回答が結果・単語統計・日次・正答率に正しく反映される', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'study', wordId: 'w001', correct: true, answer: '覚えた' });
    s = recordResult(s, { game: 'hunter', wordId: 'w001', correct: true, answer: '本' });
    s = recordResult(s, { game: 'hunter', wordId: 'w002', correct: false, answer: '誤答' });
    expect(s.results.length).toBe(3);
    expect(s.wordStats['w001'].shown).toBe(2);
    expect(s.wordStats['w001'].correct).toBe(2);
    expect(s.wordStats['w002'].wrong).toBe(1);
    expect(s.lastWordId).toBe('w002');
    expect(todayCount(s)).toBe(3);
    expect(studyDayCount(s)).toBe(1);
    expect(accuracy(s)).toBe(67); // 2/3
  });
  it('同一回答の連続記録は件数どおりに積算される（UI側ロックが二重防止の主体）', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'spell', wordId: 'w010', correct: true, answer: 'x' });
    s = recordResult(s, { game: 'spell', wordId: 'w010', correct: true, answer: 'x' });
    expect(s.results.length).toBe(2);
    expect(s.wordStats['w010'].shown).toBe(2);
    expect(accuracy(s)).toBe(100);
  });
});

describe('フロー2: ゲーム出題→判定→記録', () => {
  it('ハンターの出題・正誤・記録が連動する', () => {
    const pool = WORDS.filter((w) => w.level <= 2);
    const target = pool[0];
    const q = makeHunterQuestion(target, pool)!;
    let s = defaultProgress();
    s = recordResult(s, { game: 'hunter', wordId: target.id, correct: judgeHunter(q, q.answerIndex) });
    const wrongIdx = (q.answerIndex + 1) % q.choices.length;
    s = recordResult(s, { game: 'hunter', wordId: target.id, correct: judgeHunter(q, wrongIdx) });
    expect(s.wordStats[target.id].correct).toBe(1);
    expect(s.wordStats[target.id].wrong).toBe(1);
    expect(accuracy(s)).toBe(50);
  });
});

describe('フロー3: 復習の選出→実施→保存', () => {
  it('間違えた単語が優先され、復習結果が履歴に残る', () => {
    let s = defaultProgress();
    s = recordResult(s, { game: 'hunter', wordId: 'w020', correct: false });
    const ids = WORDS.map((w) => w.id);
    const due = dueWords(s, ids, new Date(), 20);
    expect(due[0]).toBe('w020');
    s = recordResult(s, { game: 'review', wordId: 'w020', correct: true });
    expect(s.reviewHistory.length).toBe(2);
    expect(s.reviewHistory[1]).toMatchObject({ wordId: 'w020', correct: true });
    expect(s.wordStats['w020'].lastResult).toBe(true);
  });
});

describe('フロー4: 読解の採点→記録', () => {
  it('全問正解は correct=true、一問でも誤りは false で記録される', () => {
    const entry = READINGS.find((r) => r.id === 'r7')!;
    const all = entry.questions.map((q) => q.answer);
    expect(gradeReading(entry, all)).toEqual({ score: entry.questions.length, total: entry.questions.length });
    let s = defaultProgress();
    s = recordResult(s, { game: 'reading', readingId: entry.id, correct: true, answer: '3/3' });
    expect(s.results[0]).toMatchObject({ readingId: 'r7', correct: true });
    const partial = [...all];
    partial[0] = (partial[0] + 1) % entry.questions[0].choices.length;
    const g = gradeReading(entry, partial);
    expect(g.score).toBeLessThan(g.total);
    s = recordResult(s, { game: 'reading', readingId: entry.id, correct: false, answer: `${g.score}/${g.total}` });
    expect(accuracy(s)).toBe(50);
  });
});

describe('フロー5: 再読み込み・初回・破損・初期化', () => {
  it('保存→読込で学習履歴と設定が維持される', () => {
    let s = defaultProgress();
    s.dailyGoal = 15;
    s.level = 4;
    s.fontSize = 'large';
    s = recordResult(s, { game: 'hunter', wordId: 'w001', correct: true });
    expect(saveProgress(s).ok).toBe(true);
    const { state, corrupted } = loadProgress();
    expect(corrupted).toBe(false);
    expect(state).toEqual(s);
    expect(state.dailyGoal).toBe(15);
    expect(state.studyDays[todayKey()]).toBe(1);
  });
  it('初回・破損時は初期状態で破綻しない', () => {
    expect(loadProgress().state.results).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{broken');
    const r = loadProgress();
    expect(r.corrupted).toBe(true);
    expect(r.state.results).toEqual([]);
    expect(todayCount(r.state)).toBe(0);
    expect(accuracy(r.state)).toBe(0);
    expect(studyDayCount(r.state)).toBe(0);
  });
  it('初期化後は空の初期状態に戻る', () => {
    let s = recordResult(defaultProgress(), { game: 'hunter', wordId: 'w001', correct: true });
    saveProgress(s);
    clearProgress();
    const { state } = loadProgress();
    expect(state.results).toEqual([]);
    expect(Object.keys(state.wordStats).length).toBe(0);
  });
});
