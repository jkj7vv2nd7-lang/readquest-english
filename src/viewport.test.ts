// 画面幅・表示品質の静的検査（代替検証）。
// 実機・実ブラウザの代替にはならない。CSSの構造的欠陥（固定幅・極小タップ域・
// フォーカス不可視・溢れ対策欠落）を機械的に検出することだけを目的とする。
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = () => readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const view = (n: string) => readFileSync(new URL(`./views/${n}.tsx`, import.meta.url), 'utf8');

function pxOf(pattern: RegExp, src: string): number[] {
  return [...src.matchAll(pattern)].map((m) => Number(m[1]));
}

describe('レイアウトの静的検査', () => {
  it('レイアウト崩壊を招く巨大な固定幅がない', () => {
    const c = css();
    // max-width 以外の width: Npx（N>=600）を禁止。アプリ最大幅は720pxのmax-widthのみ許容
    // メディアクエリの min-width は対象外（直前が空白・{・; の width のみ検査）
    const fixed = [...c.matchAll(/[\s{;]width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(fixed.filter((n) => n >= 600)).toEqual([]);
    expect(c).toContain('max-width: 720px');
  });
  it('タップ域が44px以上（ボタン・選択肢）', () => {
    const c = css();
    const btnMin = pxOf(/\.btn\s*\{[^}]*?min-height:\s*(\d+)px/gs, c);
    const choiceMin = pxOf(/\.choice\s*\{[^}]*?min-height:\s*(\d+)px/gs, c);
    expect(btnMin[0]).toBeGreaterThanOrEqual(44);
    expect(choiceMin[0]).toBeGreaterThanOrEqual(44);
  });
  it('フォーカス可視・溢れ対策・セーフエリアがある', () => {
    const c = css();
    expect(c).toContain(':focus-visible');
    expect(c).toContain('overflow-wrap');
    expect(c).toContain('env(safe-area-inset-bottom)');
    expect(c).toContain('-webkit-text-size-adjust');
  });
  it('placeholder付き入力にはaria-labelがある（見た目だけのラベル防止）', () => {
    for (const n of ['Words', 'Games']) {
      const src = view(n);
      const inputs = [...src.matchAll(/<input[\s\S]*?\/>/g)].map((m) => m[0]);
      for (const el of inputs) {
        if (el.includes('placeholder')) expect(el.includes('aria-label')).toBe(true);
        if (el.includes('type="checkbox"')) {
          // チェックボックスはラベル要素で囲む運用。同一ファイルにlabel.checkがあること
          expect(src.includes('<label className="check"><input')).toBe(true);
        }
      }
    }
  });
  it('正誤表示が色だけでなく文字でも伝わる', () => {
    // Games/Review/Reading/Words が「正解」「不正解」の文字列フィードバックを持つこと
    for (const n of ['Games', 'Review', 'Reading', 'Words']) {
      const src = view(n);
      const hasText = src.includes('正解') && (src.includes('不正解') || n === 'Reading');
      expect(hasText, `${n}に文字フィードバックなし`).toBe(true);
    }
  });
});
