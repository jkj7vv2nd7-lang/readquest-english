# デプロイ手順（GitHub Pages）

## 公開先

- アプリURL：https://jkj7vv2nd7-lang.github.io/readquest-english/
- リポジトリ：https://github.com/jkj7vv2nd7-lang/readquest-english
- 方式：GitHub Actions（`.github/workflows/deploy-pages.yml`）→ `dist/` をPagesに公開

## なぜ index.html のダブルクリックでは開けないのか

- 開発用 `index.html` は `/src/main.tsx`（絶対パス）を参照し、ESモジュールは `file://` でCORS制限により読み込めない
- 本番 `dist/index.html` も `http(s)` 前提（相対パス化済みだが Service Worker は `file://` で動作不可）
- 対策：`npm run dev`／`npm run preview` か、上記公開URLを使う

## 更新手順

1. `main` にpushすると自動でテスト→ビルド→公開（テスト失敗時は公開されない）
2. 初回のみPages有効化が必要だった（`gh api POST repos/{owner}/{repo}/pages -f build_type=workflow` で実施済み）
3. 改版時は `src/version.ts` と `package.json` の version を同時に上げ、SWの `CACHE` 名も上げる（RELEASE_CHECKLIST参照）

## 注意

- デプロイ・外部アップロード・プッシュは依頼者の明示指示がある場合のみ行う
- 公開リポジトリのため秘密情報は入れない（現状なし：外部送信コードなしを `release.test.ts` で検証）
