import { describe, expect, it } from 'vitest';
import { WORDS, WORD_MAP, wordsByLevel } from '../data/words';
import { READINGS } from '../data/readings';
import type { QuestionKind } from '../types';

describe('教材データ', () => {
  it('単語が300語以上あり必須フィールドを持つ', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(300);
    for (const w of WORDS) {
      expect(w.id).toBeTruthy();
      expect(w.word).toBeTruthy();
      expect(w.meanings.length).toBeGreaterThan(0);
      expect(w.examples.length).toBeGreaterThan(0);
      expect(w.source).toBeTruthy();
      expect(w.license).toBeTruthy();
    }
  });
  it('id の重複がない', () => {
    const ids = WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('単語表記の重複がない（大小無視・前後空白無視）', () => {
    const names = WORDS.map((w) => w.word.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
  it('id・IPA・品詞・レベルの形式が正しい', () => {
    const pos = new Set(['名詞', '動詞', '形容詞', '副詞', '接続詞', '前置詞', '句動詞', '接続表現']);
    for (const w of WORDS) {
      expect(w.id).toMatch(/^w\d+$/);
      expect(w.ipa.startsWith('/') && w.ipa.endsWith('/') && w.ipa.length >= 3).toBe(true);
      expect(pos.has(w.partOfSpeech)).toBe(true);
      expect(w.level).toBeGreaterThanOrEqual(1);
      expect(w.level).toBeLessThanOrEqual(5);
    }
  });
  it('意味・例文・訳に空文字がない', () => {
    for (const w of WORDS) {
      for (const m of w.meanings) expect(m.trim().length).toBeGreaterThan(0);
      for (const ex of w.examples) {
        expect(ex.en.trim().length).toBeGreaterThan(0);
        expect(ex.ja.trim().length).toBeGreaterThan(0);
      }
      expect(w.meanings[0].trim().length).toBeGreaterThan(0);
    }
  });
  it('MAPの件数が配列と一致し参照切れがない', () => {
    expect(WORD_MAP.size).toBe(WORDS.length);
    for (const w of WORDS) expect(WORD_MAP.get(w.id)).toBeDefined();
  });
  it('レベル絞り込みが動く', () => {
    expect(wordsByLevel(1).every((w) => w.level <= 1)).toBe(true);
    expect(wordsByLevel(5).length).toBe(WORDS.length);
  });
  it('MAP参照が一致する', () => {
    expect(WORD_MAP.get('w001')?.word).toBe('book');
  });
  it('読解教材が段階的で設問・解説を持つ', () => {
    expect(READINGS.length).toBeGreaterThanOrEqual(4);
    const levels = READINGS.map((r) => r.level);
    expect(Math.min(...levels)).toBe(1);
    for (const r of READINGS) {
      expect(r.questions.length).toBeGreaterThan(0);
      for (const q of r.questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
        expect(q.explanation).toBeTruthy();
      }
      expect(r.body.length).toBe(r.bodyJa.length);
    }
  });
  it('各レベルに2編以上の読解教材がある', () => {
    expect(READINGS.length).toBeGreaterThanOrEqual(10);
    for (const lv of [1, 2, 3, 4, 5]) {
      expect(READINGS.filter((r) => r.level === lv).length, `Lv${lv}不足`).toBeGreaterThanOrEqual(2);
    }
  });
  it('上級（Lv4・Lv5）の読解は要旨・推論・意図のいずれかを含む', () => {
    for (const r of READINGS.filter((x) => x.level >= 4)) {
      const kinds = new Set(r.questions.map((q) => q.kind ?? 'detail'));
      const advanced = (['gist', 'inference', 'intent'] as QuestionKind[]).some((k) => kinds.has(k));
      expect(advanced, `${r.id}に応用設問なし`).toBe(true);
    }
  });
  it('読解の語句と単語データの意味が一致する（重なる場合）', () => {
    const byWord = new Map(WORDS.map((w) => [w.word.toLowerCase(), w]));
    let checked = 0;
    for (const r of READINGS) {
      for (const v of r.vocab) {
        const entry = byWord.get(v.word.toLowerCase());
        if (!entry) continue;
        checked += 1;
        expect(entry.meanings, `${r.id}:${v.word}の意味不一致`).toContain(v.meaning);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('例文に見出し語が含まれ、訳の終端記号が整っている', () => {
    for (const w of WORDS) {
      const headTokens = w.word.toLowerCase().split(/\s+/);
      for (const ex of w.examples) {
        const enTokens = ex.en.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
        const hit = headTokens.every((ht) => enTokens.some((et) => et.includes(ht)));
        expect(hit, `${w.id}の例文に見出し語なし`).toBe(true);
        expect(ex.en.trim()).toMatch(/[.!?]$/);
        expect(ex.ja.trim()).toMatch(/[。？！?…]$/);
      }
    }
  });
  it('読解の選択肢に重複がなく、語句は本文に登場する', () => {
    for (const r of READINGS) {
      const body = r.body.join(' ').toLowerCase();
      for (const v of r.vocab) {
        expect(body.includes(v.word.toLowerCase()), `${r.id}の語句「${v.word}」が本文にない`).toBe(true);
      }
      for (const q of r.questions) {
        expect(new Set(q.choices).size, `${r.id}の選択肢重複`).toBe(q.choices.length);
      }
      // 可読性の上限：平均文長15語以下（実機での読みやすさの目安）
      const words = r.body.join(' ').split(/\s+/).length;
      const sentences = r.body.join(' ').split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      expect(words / Math.max(1, sentences), `${r.id}の平均文長が上限超え`).toBeLessThanOrEqual(15);
    }
  });
});
