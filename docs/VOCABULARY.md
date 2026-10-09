# 語彙データ台帳（2026-10-09／第3フェーズ）

## 総数

- **300語**（w001〜w300。第3フェーズ目標を達成）
- 内訳（実測）：Lv1: 50語／Lv2: 65語／Lv3: 55語／Lv4: 69語／Lv5: 61語

| ファイル | 件数 | 内容 |
|---|---|---|
| `src/data/words1.ts` | 50 | 入門（中学基礎） |
| `src/data/words2.ts` | 50 | 初級（中学〜高校） |
| `src/data/words3.ts` | 60 | 中級〜上級 |
| `src/data/words4.ts` | 64 | 接続表現・句動詞・読解頻出語 |
| `src/data/words5.ts` | 32（新規） | Lv4 説明文・論説語彙（w225–w256） |
| `src/data/words6.ts` | 44（新規） | Lv5 上級・新聞の論説語彙（w257–w300） |

## 第3フェーズの監査結果（追加前→追加後）

- id重複：なし（スクリプト＋テストで確認）
- 単語表記重複：なし
- 追加後の自動検査で2件の実不備を検出・修正：
  1. r5（Lv4既存）に要旨・推論・意図の設問がなかった → Q3を `inference` に指定
  2. r6の語句 `claim`＝「主張」と単語データ（主張する・要求する）の不一致 → 語句を `insist`＝「主張する」に差し替え（本文にも出現）
- 全例文・訳は編集部自作。外部由来データなし。`source`/`license` 全件記載
- IPAは目視確認レベル（厳密な音声学的検証は未実施のため台帳に明記）

## 第4フェーズの追加監査

- 例文300件を機械点検し、見出し語の原形を含まない6件（buy/give/send/imply/intensify/magnify の活用形のみ）を原形を含む文に修正。意味・訳の正確性は維持
- 例文の終端記号（英 .!?／日 。？！…）を全件検査し、不備なし
- 選択肢の重複：読解29問すべてで重複なし

## 読解での使われ方（語彙×読解の連携）

- 新規読解 r7〜r10 の語句は単語データと意味一致（テストで自動検証）
  - r7：small／play／morning、r8：library／borrow／enjoy
  - r9：article／evaluate／reliable／bias、r10：metaphor／ambiguous／perspective／coherent
- r10のQ4は単語データ（w263 critical）への参照付き解説

## 追加手順（再掲）

1. `src/data/wordsN.ts` に `WordEntry[]` を追記（idは連番で一意に。次は `w301` 以降）
2. `src/data/words.ts` の結合配列に追加
3. `npm test`（件数・重複・形式・空文字・MAP一致を自動検査）→ `npm run build`
