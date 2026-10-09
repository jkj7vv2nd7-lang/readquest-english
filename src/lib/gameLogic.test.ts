import { describe, expect, it } from 'vitest';
import {
  gradeReading,
  judgeHunter,
  judgeMatch,
  judgeSpelling,
  makeHunterQuestion,
  makeMatchPairs,
  pick,
  shuffle,
} from './gameLogic';
import type { ReadingEntry, WordEntry } from '../types';

const w = (id: string, word: string, meaning: string): WordEntry => ({
  id, word, meanings: [meaning], partOfSpeech: '名詞', ipa: '/test/',
  examples: [], level: 1, tags: [], collocations: [], source: 't', license: 't',
});

const pool = [w('a', 'book', '本'), w('b', 'water', '水'), w('c', 'dog', '犬'), w('d', 'cat', '猫'), w('e', 'sun', '太陽')];

describe('shuffle/pick', () => {
  it('元配列を破壊しない', () => {
    const src = [1, 2, 3];
    shuffle(src);
    expect(src).toEqual([1, 2, 3]);
  });
  it('不足時はある分だけ返す', () => {
    expect(pick([w('a', 'x', 'y')], 5)).toHaveLength(1);
    expect(pick([], 4)).toHaveLength(0);
  });
});

describe('意味ハンター', () => {
  it('正解を含む4択を作る', () => {
    const q = makeHunterQuestion(pool[0], pool, () => 0.5);
    expect(q).not.toBeNull();
    expect(q!.choices).toContain('本');
    expect(q!.choices.length).toBe(4);
  });
  it('データ不足でもクラッシュせず減った選択肢を返す', () => {
    const q = makeHunterQuestion(pool[0], [pool[0]]);
    expect(q).not.toBeNull();
    expect(q!.choices).toContain('本');
  });
  it('正誤判定が動く', () => {
    const q = makeHunterQuestion(pool[0], pool, () => 0.1)!;
    expect(judgeHunter(q, q.answerIndex)).toBe(true);
    expect(judgeHunter(q, (q.answerIndex + 1) % q.choices.length)).toBe(false);
  });
});

describe('スペル工房', () => {
  it('大小・空白を無視して判定', () => {
    const target = w('a', 'Book', '本');
    expect(judgeSpelling(target, 'book')).toBe(true);
    expect(judgeSpelling(target, '  BOOK ')).toBe(true);
    expect(judgeSpelling(target, 'bok')).toBe(false);
  });
});

describe('ペアマッチ', () => {
  it('2件未満では null', () => {
    expect(makeMatchPairs([])).toBeNull();
    expect(makeMatchPairs([pool[0]])).toBeNull();
  });
  it('対応判定が動く', () => {
    const p = makeMatchPairs(pool)!;
    const left = p.left[0];
    expect(judgeMatch(p, left.id, left.id)).toBe(true);
    expect(judgeMatch(p, left.id, 'nope')).toBe(false);
  });
  it('右側の意味テキストに重複がない（同文言の曖昧さを排除）', () => {
    const dupPool = [w('a', 'speak', '話す'), w('b', 'talk', '話す'), w('c', 'dog', '犬'), w('d', 'cat', '猫')];
    for (let i = 0; i < 20; i++) {
      const p = makeMatchPairs(dupPool);
      if (!p) continue;
      const texts = p.right.map((r) => r.text);
      expect(new Set(texts).size).toBe(texts.length);
      const ids = p.left.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('意味が全て同一のプールでは null になる', () => {
    expect(makeMatchPairs([w('a', 'speak', '話す'), w('b', 'talk', '話す')])).toBeNull();
  });
});

describe('ハンター選択肢の不変条件', () => {
  it('100回生成しても正解 inclusion・正解不一致除外・answerIndex整合が保たれる', () => {
    for (let i = 0; i < 100; i++) {
      const target = pool[i % pool.length];
      const q = makeHunterQuestion(target, pool)!;
      const correct = target.meanings[0];
      expect(q.choices).toContain(correct);
      expect(q.answerIndex).toBe(q.choices.indexOf(correct));
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }
  });
});

describe('リーディング採点', () => {
  const entry: ReadingEntry = {
    id: 'r', title: 't', titleJa: 't', level: 1, body: [], bodyJa: [], vocab: [],
    questions: [
      { q: 'q1', choices: ['a', 'b'], answer: 0, explanation: 'e1' },
      { q: 'q2', choices: ['a', 'b'], answer: 1, explanation: 'e2' },
    ],
    source: 't', license: 't',
  };
  it('全問正解・部分点を計算', () => {
    expect(gradeReading(entry, [0, 1])).toEqual({ score: 2, total: 2 });
    expect(gradeReading(entry, [1, 1])).toEqual({ score: 1, total: 2 });
    expect(gradeReading(entry, [])).toEqual({ score: 0, total: 2 });
  });
});
