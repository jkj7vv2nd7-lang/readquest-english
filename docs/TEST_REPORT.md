# テスト報告（2026-10-09／第4フェーズ追記あり）

## 実行コマンドと結果

すべて `C:\OpenCord\english` で実行。PowerShellの実行ポリシー回避のため `cmd /c` 経由。

### 第1フェーズ（初回）

| # | コマンド | 結果 |
|---|---|---|
| 1 | `cmd /c "npx vitest run"` | ✅ 3ファイル・21テスト全パス（gameLogic 9、storage 7、data 5） |
| 2 | `cmd /c "npx tsc --noEmit"` | ✅ エラーなし（※ただし後述の注記あり） |
| 3 | `cmd /c "npx oxlint"` | ✅ エラー0・警告2（`new Date()` のpurity警告のみ。動作に影響なし） |
| 4 | `cmd /c "npm run build"` | ✅ 成功（`dist/` 生成、JS約301KB/gzip約92KB） |
| 5 | 本番スモーク（`vite preview --port 4174`＋HTTP取得） | ✅ `/` 200（#root・manifest参照あり）、`manifest.webmanifest` 200、`sw.js` 200 |

### 第2フェーズ（今回）

| # | コマンド | 結果 |
|---|---|---|
| 6 | `cmd /c "npx vitest run"` | ✅ 4ファイル・38テスト全パス（gameLogic 12、storage 13、data 9、pwa 4） |
| 7 | `cmd /c "npm run typecheck"`（= `tsc -b` に修正） | ✅ エラーなし |
| 8 | `cmd /c "npx oxlint"` | ✅ エラー0・警告2（同上。動作に影響なし） |
| 9 | `cmd /c "npm run build"` | ✅ 成功（JS約321KB/gzip約97KB、CSS約6KB） |
| 10 | 本番スモーク（`vite preview --port 4175`＋HTTP取得） | ✅ `/` 200、`manifest.webmanifest` 200（PNG参照あり・dist直読で確認）、`icon-192.png` 200、`sw.js` 200（v2） |

注記：第1フェーズの `tsc --noEmit` はルートがソリューション形式（`files: []`）のため実質無検査だった。
第2フェーズで `typecheck` スクリプトを `tsc -b` に修正し、`pwa.test.ts` の `node:fs` 参照で検出された不足（`tsconfig.app.json` の `types` に `node` を追加）も解消した。

### 第3フェーズ（今回）

| # | コマンド | 結果 |
|---|---|---|
| 11 | `cmd /c "npx vitest run"` | ✅ 5ファイル・45テスト全パス（gameLogic 12、storage 13、data 12、pwa 4、release 4） |
| 12 | `cmd /c "npm run typecheck"`（= `tsc -b`） | ✅ エラーなし（途中1件検出→即修正して再通過） |
| 13 | `cmd /c "npx oxlint"` | ✅ エラー0・警告2（同上。動作に影響なし） |
| 14 | `cmd /c "npm run build"` | ✅ 成功（JS約351KB/gzip約105KB） |
| 15 | 本番スモーク（`vite preview --port 4176`＋HTTP取得） | ✅ `/` 200、`apple-touch-icon.png` 200、`sw.js` 200 |

第3フェーズでは新規テストが実不備3件を検出し、すべて修正して再通過した（r5応用設問不足、r6語句と単語データの意味不一致、テスト自体の型エラー1件）。
詳細は `docs/VOCABULARY.md` の監査結果を参照。

### 第4フェーズ（今回・v0.3.1）

| # | コマンド | 結果 |
|---|---|---|
| 16 | `cmd /c "npx vitest run"` | ✅ 7ファイル・62テスト全パス（gameLogic 12、storage 13、data 14、pwa 4、release 6、flows 8、viewport 5） |
| 17 | `cmd /c "npm run typecheck"`（= `tsc -b`） | ✅ エラーなし |
| 18 | `cmd /c "npx oxlint"` | ✅ エラー0・警告2（同上。動作に影響なし） |
| 19 | `cmd /c "npm run build"` | ✅ 成功（JS約351KB/gzip約105KB） |
| 20 | 本番スモーク（`vite preview --port 4177`＋HTTP取得） | ✅ `/` 200、sw.js 200（v3・404応答あり） |

第4フェーズの指摘と対応：
- SW v2が資産取得失敗時にindex.htmlを返し404を秘匿 → v3で404応答に修正（`release.test.ts`で検証）
- 復習セッションの回答FBが色のみ依存 →「正解！／不正解」文字を追加
- 例文6件が見出し語の原形を含まない（活用形のみ） → 原形を含む文に修正（意味・訳の正確性は維持）
- 未使用テンプレート残骸（App.css・assets・favicon.svg・icons.svg）を参照なし確認の上で削除
- E2E判断：Playwright等の新規導入は見送り。理由＝ブラウザ自動操作基盤なし・実機代替にならない・費用対効果。代わりに `flows.test.ts`（利用フロー統合）＋ `viewport.test.ts`（CSS静的検査）を追加し、範囲を文書化

## テスト内容の対応表

- 4ゲームの正誤判定：`gameLogic.test.ts`（ハンター生成・判定、スペル大小空白無視、マッチ成立条件・判定）
- ハンター不変条件（新規）：100回生成でも「正解含有・ダミーとの不一致・answerIndex整合・選択肢重複なし」
- マッチ意味一意性（新規）：重複意味プールでも右側テキストが重複しない、全同一時は null
- データ保存と再読み込み：`storage.test.ts`（保存→読込一致、初回空状態、不正JSON・不正形式→初期化＋corrupted）
- SRS追加（新規）：状態不変性、連続正解で上限30日、誤答後は翌日予定、日跨ぎキー、wordIdなし記録、旧形式（最小v1）互換
- 復習対象の抽出：`storage.test.ts`（直近不正解の最優先、上限遵守、空入力耐性）
- 読解問題の採点：`gameLogic.test.ts`（全問・部分点・未回答）
- 教材完全性：`data.test.ts`（300語以上・必須項目・id重複なし・表記重複なし・id/IPA/品詞/レベル形式・空文字検査・MAP一致・レベル絞り込み・設問と解説の整合・本文訳の対応・各Lv2編以上・上級応用設問・語句と単語データの意味一致）
- PWA参照（新規）：`pwa.test.ts`（manifest必須項目＋PNG 192/512実在、SWの更新戦略、main.tsxの登録、index.htmlの参照）
- 公開準備：`release.test.ts`（バージョン一致、HTMLメタ、コントラストAA、SW配布内訳・404方針、外部通信なし）
- 利用フロー：`flows.test.ts`（記録→統計→復習→読解→保存→復元→破損→初期化の一貫性。実ブラウザE2Eではない）
- 画面静的検査：`viewport.test.ts`（固定幅・44px域・focus・溢れ・ラベル・文字FB。実機代替ではない）
- 主要画面の遷移：コード上のタブ遷移＋単語深掘り遷移。⚠️ ブラウザ自動操作は未実施（目視確認が必要）
- スマートフォン表示：CSSはモバイルファースト（最大幅720px・下部ナビ・44pxボタン、focus-visible、溢れ防止追加）だが、⚠️ 実機・DevToolsでの目視確認は未実施

## 未検証（正直な報告）

1. 実ブラウザでのクリック操作フロー全体（単体テスト＋ビルド＋HTTP取得のみ実施）
2. 実機スマートフォン表示・タップ操作感
3. PWAのインストールバナー・完全オフライン動作（SWは実装・配信確認・コード検査のみ。ネットワーク切断テスト未実施）
4. Web Speech APIの発音（ブラウザ・OS依存。未対応時は代替表示になる設計。voicesウォームアップはコード検査のみ）
5. 単語300語のうちIPAの厳密な正確性は目視レベルのみ（意味・例文・訳は自作で確認済み）

自動／手動／コード確認の区分と公開手順は `docs/RELEASE_CHECKLIST.md` に集約した。
コントラスト計算の対象ペアと結果：本文 #23272f/白＝14.97、補助 #6b7280/白＝4.83、ボタン白/#1d7a4f＝5.32、警告 #b3261e/白＝6.54。対象外の配色の適合は保証しない。
