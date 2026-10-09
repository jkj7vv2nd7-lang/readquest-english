// PWA資材の参照・内容テスト（node fs で実ファイルを検証）
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const pub = (p: string) => new URL(`../public/${p}`, import.meta.url);
const src = (p: string) => new URL(`./${p}`, import.meta.url);

describe('PWA manifest', () => {
  it('必須項目を持ち参照アイコンが実在する', () => {
    const raw = readFileSync(pub('manifest.webmanifest'), 'utf8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'theme_color', 'background_color']) {
      expect(m[k], `missing ${k}`).toBeDefined();
    }
    const icons = m.icons as { src: string; sizes: string }[];
    expect(icons.length).toBeGreaterThanOrEqual(2);
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const i of icons) {
      const file = i.src.replace(/^\.\//, '');
      expect(existsSync(pub(file)), `icon missing: ${i.src}`).toBe(true);
    }
  });
});

describe('サービスワーカー', () => {
  it('更新戦略（バージョン付きCACHE・旧削除・navigate分岐）を持つ', () => {
    const sw = readFileSync(pub('sw.js'), 'utf8');
    expect(sw).toMatch(/readquest-v\d+/);
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('activate'");
    expect(sw).toContain("addEventListener('fetch'");
    expect(sw).toContain('caches.delete');
    expect(sw).toContain('navigate');
  });
  it('main.tsx が sw.js を登録している', () => {
    const main = readFileSync(src('main.tsx'), 'utf8');
    expect(main).toContain('sw.js');
    expect(main).toContain('serviceWorker');
  });
  it('index.html が manifest を参照している', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('theme-color');
  });
});
