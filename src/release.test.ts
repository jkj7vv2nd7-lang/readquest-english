// 公開準備の自動検査：メタ・バージョン・コントラスト・SW内訳・プライバシー
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from './version';

const srcDir = dirname(fileURLToPath(import.meta.url));

function allSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === 'node_modules') continue;
      out.push(...allSourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e)) {
      out.push(p);
    }
  }
  return out;
}

const pub = (p: string) => new URL(`../public/${p}`, import.meta.url);
const root = (p: string) => new URL(`../${p}`, import.meta.url);

function luminance(hex: string): number {
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(hex.substring(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('公開バージョン', () => {
  it('APP_VERSION が package.json と一致し semver 形式', () => {
    const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8')) as { version: string };
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe(pkg.version);
  });
});

describe('HTMLメタ（公開・モバイル）', () => {
  it('言語・viewport・説明・アイコン参照を持つ', () => {
    const html = readFileSync(root('index.html'), 'utf8');
    expect(html).toContain('<html lang="ja"');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('name="description"');
    expect(html).toContain('apple-touch-icon');
    expect(html).toContain('mobile-web-app-capable');
    expect(existsSync(pub('apple-touch-icon.png'))).toBe(true);
  });
});

describe('テキストコントラスト（WCAG AA 4.5以上）', () => {
  // 色値は src/index.css と対応させること
  it('主要な文字色が背景色に対して十分な比を持つ', () => {
    expect(contrast('23272f', 'ffffff')).toBeGreaterThanOrEqual(4.5); // 本文
    expect(contrast('6b7280', 'ffffff')).toBeGreaterThanOrEqual(4.5); // 補助文
    expect(contrast('ffffff', '1d7a4f')).toBeGreaterThanOrEqual(4.5); // 主要ボタン文字
    expect(contrast('b3261e', 'ffffff')).toBeGreaterThanOrEqual(4.5); // 警告文
  });
});

describe('サービスワーカーの配布内訳', () => {
  it('プリキャッシュ対象がすべて実在する', () => {
    const sw = readFileSync(pub('sw.js'), 'utf8');
    const m = sw.match(/const CORE = \[([^\]]+)\]/);
    expect(m).not.toBeNull();
    const files = [...(m![1].matchAll(/'\.\/([^']+)'/g))].map((x) => x[1]);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      // index.html はルート、その他は public 配下に実在すること
      const loc = f === 'index.html' ? root(f) : pub(f);
      expect(existsSync(loc), `SW配布欠落: ${f}`).toBe(true);
    }
  });
  it('資産の取得失敗を成功扱いにしない（404応答）', () => {
    const sw = readFileSync(pub('sw.js'), 'utf8');
    expect(sw).toContain('status: 404');
  });
});

describe('プライバシー（外部送信なし）', () => {
  it('アプリ本体が外部通信APIを使っていない', () => {
    // 音声合成（Web Speech API）は端末内で処理され、ここでの外部通信には含めない
    const banned = [/fetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /EventSource/, /WebSocket/, /axios/, /from\s+['"]https?:/];
    const offenders: string[] = [];
    for (const f of allSourceFiles(srcDir)) {
      const t = readFileSync(f, 'utf8');
      for (const re of banned) {
        if (re.test(t)) offenders.push(`${f}: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
