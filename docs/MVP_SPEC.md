# ReadQuest English — MVP仕様

## 1. 概要

- アプリ名：ReadQuest English（「英単語から、英語で本を読む力へ。」）
- 技術：React 19 + TypeScript + Vite（`C:\OpenCord\english` 新規作成。調査時ディレクトリは空だった）
- 対象：日本語母語の英語学習者、スマートフォン中心
- 外部サービス・有料API：不使用（音声は Web Speech API＝ブラウザ標準・無料）

## 2. 画面と機能

### ホーム（`src/views/Home.tsx`）
- 今日の学習目標：`studyDays[今日]/dailyGoal` の進捗バー
- 学習の続き：`lastWordId` の単語へ遷移
- 復習対象数：`dueWords()` の件数表示
- 進捗：学習日数、正答率、学習単語数、回答総数

### 単語学習（`src/views/Words.tsx`）
- レベル以下で絞り込み＋検索（英・日）
- 詳細：意味、品詞、IPA、例文＋訳、スペル練習（正誤表示）、関連語句、タグ
- 「覚えた／まだ」で `study` 結果を記録
- 音声ボタンは `speechSupported()` が真のときのみ表示

### ゲーム（`src/views/Games.tsx`、ロジック `src/lib/gameLogic.ts`）
1. 意味ハンター：4択（不足時は減る）。`makeHunterQuestion` / `judgeHunter`
2. スペル工房：大小・空白無視。`judgeSpelling`。判定中はボタン無効＋Enter対応（連打の二重記録防止）
3. リスニング探偵：TTS再生＋4択。未対応端末は単語表示にフォールバック
4. 単語ペアマッチ：2〜4ペア。`makeMatchPairs`（2件未満は null→案内表示、右側の意味重複を排除）/ `judgeMatch`（再入ロック付き）
- 各5問（マッチは1セット）。正誤・解説・結果記録あり。リトライは全リロードせずセッション内で再出題

### 復習（`src/views/Review.tsx`、抽出 `dueWords()`）
- 優先度：直近不正解（100+）＞期限到来（60+）＞苦手（50）＞未学習（30）
- 復習リスト（予定日表示）、苦手トップ10、履歴直近10件、10問セッション

### リーディング（`src/views/Reading.tsx`、教材 `src/data/readings.ts`）
- 10編（各レベル2編：Lv1〜Lv5）
- 訳は既定で非表示→チェックで表示。本文TTS、語句TTS、選択式理解問題、`gradeReading` 採点＋解説
- 設問種別（`QuestionKind`）：内容理解／要旨／推論／筆者の意図／語彙。Lv4以上は応用設問を必須化（テストで検証）

### 記録と設定（`src/views/Stats.tsx`）
- 日数・正答率・単語数・回答数・14日グラフ
- 目標（1〜100）、レベル（1〜5）、文字サイズ（小・中・大→`body[data-fontsize]`）
- 破損通知・保存失敗通知、2段階確認の初期化

## 3. データ構造

`WordEntry`：id / word / meanings / partOfSpeech / ipa / audio（任意・現状未使用、TTS利用）/ examples{en,ja} / level(1-5) / tags / collocations / source / license

`ProgressState`（version: 1）：dailyGoal / level / fontSize / results（最大1000）/ wordStats / studyDays / lastWordId / reviewHistory（最大500）/ createdAt

`WordStats`：shown / correct / wrong / lastResult / lastStudied / nextReview / intervalDays

保存の不変条件：`recordResult` は前状態の `WordStats` オブジェクトを書き換えない（コピーを作成）。
仕様変更時は `version: 1` のまま旧形式（最小項目）を読める互換性を保つ。

## 4. 単語データの追加手順

1. `src/data/wordsN.ts` に `WordEntry[]` を追記（idは連番で一意に。次は `w301` 以降）
2. `src/data/words.ts` で結合配列に追加
3. 意味・例文・訳の正確性を目視確認（未確認データで件数合わせをしない）
4. `npm test`（`data.test.ts` が件数・重複・形式・空文字を検証）→ `npm run build`

現状：300語（実測：Lv1:50、Lv2:65、Lv3:55、Lv4:69、Lv5:61）。詳細は `docs/VOCABULARY.md`。

## 6. 公開バージョンと確認区分

- バージョンは `src/version.ts` の `APP_VERSION` と `package.json` を一致させる（`release.test.ts` が検証）
- 自動検査済みと手動確認事項の区分は `docs/RELEASE_CHECKLIST.md` に記録する

## 5. PWA・オフライン範囲

- `manifest.webmanifest`（PNG 192/512px＋SVG。アイコンはPIL生成の自作）
- `sw.js` v3：ナビゲーションは network-first（更新を届ける）、資産は cache-first、起動時に旧キャッシュ削除。資産の取得失敗時は404を返し成功扱いにしない。学習履歴はlocalStorageにありSW更新の影響を受けない。デプロイ時はCACHE名を上げる
- オフライン利用できるのは一度読み込んだ範囲のみ。未検証事項は TEST_REPORT 参照
