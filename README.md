# ReadQuest English

**英単語から、英語で本を読む力へ。**

日本語を母語とする学習者向けの英語学習アプリ。単語の意味・発音・スペルから始め、
短文→段落→説明文へと段階を上げ、最終的に洋書・英字新聞を自力で読める力を育てます。
React + TypeScript + Vite。スマートフォン対応・PWA対応。

## 起動・確認方法

前提：Node.js 20以上（動作確認：Node v24 / npm 11 / Windows）。

```cmd
cd C:\OpenCord\english
cmd /c "npm install"
cmd /c "npm run dev"
```

ブラウザで表示されるURL（例 `http://localhost:5173/`）を開きます。
PowerShellでは `npm.ps1` の実行ポリシーで失敗する場合があるため、`cmd /c "npm ..."` の形を推奨します。

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 型検査＋本番ビルド（`dist/`） |
| `npm run preview` | 本番ビルドの確認用サーブ |
| `npm test` | 単体・統合テスト（vitest・62件） |
| `npm run typecheck` | 型検査のみ（`tsc -b`） |
| `npm run lint` | Lint（oxlint） |

## 実装済み機能（すべて実操作可）

- **ホーム**：今日の学習目標（進捗バー）、学習の続き、復習対象数、学習日数・正答率・単語数・回答数
- **単語学習**：300語（Lv1:50／Lv2:65／Lv3:55／Lv4:69／Lv5:61）。意味・品詞・発音記号・例文（日訳付き）・スペル練習・関連語句・レベル表示、音声読み上げ（Web Speech API・無料・外部API不要）
- **4種のゲーム**：意味ハンター／スペル工房／リスニング探偵／単語ペアマッチ。正誤判定・フィードバック・解説・結果記録付き。問題不足時もクラッシュしない設計
- **復習**：間違い記録、苦手トップ、復習履歴、復習予定日、簡易SRS（正解で間隔2倍・最大30日、不正解で1日に戻る）、10問セッション
- **リーディング**：自作教材10編（各レベル2編、CC-BY-4.0表記）。要旨・推論・筆者の意図の設問種別あり
- **記録と設定**：学習日数・正答率・単語数・14日グラフ、日々目標・学習レベル・文字サイズ、保存失敗通知、確認付きデータ初期化

## データ保存

- `localStorage`（キー `readquest-progress-v1`）に学習履歴を保存。再読み込み後も保持
- 初回・破損データでも初期状態で動作し、破損時は設定画面で通知
- 保存失敗時は設定画面にエラーを表示（容量不足など）
- 外部サービス・有料APIは不使用。同期は将来拡張

## 教材データ

- `src/data/words1.ts`〜`words6.ts`：検証済み300語（内訳は `docs/VOCABULARY.md`）。未確認データでの水増しはしていない
- `src/data/readings.ts`：自作読解10編（各レベル2編、CC-BY-4.0表記）
- 全例文・訳は編集部自作のためライセンスはクリーン

## PWA・オフライン

- `public/manifest.webmanifest`、`public/icon-{192,512}.png`＋`icon.svg`＋`apple-touch-icon.png`、`public/sw.js` v3（ナビ network-first／資産 cache-first／旧キャッシュ削除／資産失敗時は404）
- 本番ビルドの配信時にインストール可能。オフラインで利用できるのは読み込んだ画面の範囲のみ
- **未検証**：実機でのインストールバナー・完全オフライン動作・ネットワーク切断テスト（手動確認が必要。`docs/RELEASE_CHECKLIST.md` 参照）

## ドキュメント

- `docs/MVP_SPEC.md`：仕様
- `docs/TEST_REPORT.md`：テスト結果（実行コマンド付き）
- `docs/ROADMAP.md`：今後の作業
- `docs/VOCABULARY.md`：語彙データ台帳（件数・選定方針・監査結果）
- `docs/RELEASE_CHECKLIST.md`：公開前チェックリスト（自動／コード確認／手動の区分）
- `docs/GUIDE.md`：利用者向け操作ガイド
