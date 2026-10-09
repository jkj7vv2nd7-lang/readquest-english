import { useMemo, useState } from 'react';
import type { ProgressState } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { dueWords } from '../lib/storage';
import { judgeHunter, makeHunterQuestion, shuffle } from '../lib/gameLogic';
import { speakEnglish, speechSupported } from '../lib/speech';

export function ReviewView({
  progress, onRecord, onOpenWord,
}: {
  progress: ProgressState;
  onRecord: (r: { game: 'review'; wordId: string; correct: boolean; answer?: string }) => void;
  onOpenWord: (id: string) => void;
}) {
  const [session, setSession] = useState(false);
  const due = useMemo(
    () => dueWords(progress, WORDS.map((w) => w.id), new Date(), 20),
    [progress],
  );
  const weak = useMemo(() => {
    return Object.entries(progress.wordStats)
      .filter(([, s]) => s.wrong > 0)
      .sort((a, b) => b[1].wrong / Math.max(1, b[1].shown) - a[1].wrong / Math.max(1, a[1].shown))
      .slice(0, 10);
  }, [progress]);

  return (
    <div className="stack">
      <div className="card">
        <h2>復習</h2>
        <p>復習対象 <strong>{due.length}</strong> 語（間違い・期限到来・未学習の優先順）</p>
        <div className="btn-row">
          <button className="btn primary" disabled={due.length === 0} onClick={() => setSession(true)}>
            {session ? 'セッション中' : '復習セッション開始'}
          </button>
          {session && <button className="btn" onClick={() => setSession(false)}>終了</button>}
        </div>
        {session && <ReviewSession ids={due} onRecord={onRecord} onDone={() => setSession(false)} />}
      </div>

      <div className="card">
        <h3>復習リスト</h3>
        {due.length === 0 && <p className="muted">復習対象はありません。新しい単語を学びましょう。</p>}
        {due.map((id) => {
          const w = WORD_MAP.get(id);
          const st = progress.wordStats[id];
          if (!w) return null;
          return (
            <div key={id} className="row-between list-row">
              <div>
                <strong>{w.word}</strong> <span className="muted">— {w.meanings[0]}</span>
                <div className="muted small">{st ? `正解率 ${st.shown ? Math.round((st.correct / st.shown) * 100) : 0}%（${st.correct}/${st.shown}） 予定:${st.nextReview?.slice(0, 10) ?? '—'}` : '未学習'}</div>
              </div>
              <div className="btn-row">
                {speechSupported() && <button className="btn small" onClick={() => speakEnglish(w.word)}>音声</button>}
                <button className="btn small" onClick={() => onOpenWord(id)}>学習</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>苦手な単語トップ</h3>
        {weak.length === 0 && <p className="muted">まだ間違い記録がありません。</p>}
        {weak.map(([id, s]) => {
          const w = WORD_MAP.get(id);
          return <p key={id} className="list-row"><strong>{w?.word}</strong> <span className="muted">— 不正解 {s.wrong} 回 / 出題 {s.shown} 回</span></p>;
        })}
      </div>

      <div className="card">
        <h3>復習履歴（直近10件）</h3>
        {progress.reviewHistory.length === 0 && <p className="muted">履歴はまだありません。</p>}
        {[...progress.reviewHistory].slice(-10).reverse().map((h, i) => (
          <p key={i} className="small">{h.date.slice(0, 10)} {WORD_MAP.get(h.wordId)?.word} — {h.correct ? '○' : '×'}</p>
        ))}
      </div>
    </div>
  );
}

function ReviewSession({ ids, onRecord, onDone }: { ids: string[]; onRecord: (r: { game: 'review'; wordId: string; correct: boolean; answer?: string }) => void; onDone: () => void }) {
  const order = useMemo(() => shuffle(ids).slice(0, 10), [ids]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const target = WORD_MAP.get(order[idx]);
  const q = useMemo(() => (target ? makeHunterQuestion(target, WORDS) : null), [target]);
  if (order.length === 0) return <p className="muted">対象がありません。</p>;
  if (idx >= order.length) return <div><p className="good">終了！ {score}/{order.length} 正解</p><button className="btn" onClick={onDone}>閉じる</button></div>;
  if (!q || !target) return <p>問題を作成できませんでした。</p>;
  return (
    <div className="session">
      <p className="muted">第 {idx + 1} 問 / {order.length}</p>
      <h3>{target.word}</h3>
      <div className="choices">
        {q.choices.map((c, i) => (
          <button key={i} disabled={picked !== null} className={`choice${picked === i ? (i === q.answerIndex ? ' correct' : ' wrong') : ''}${picked !== null && i === q.answerIndex ? ' correct' : ''}`}
            onClick={() => {
              setPicked(i);
              const ok = judgeHunter(q, i);
              onRecord({ game: 'review', wordId: target.id, correct: ok, answer: c });
              if (ok) setScore((s) => s + 1);
              setTimeout(() => { setPicked(null); setIdx((v) => v + 1); }, 900);
            }}>{c}</button>
        ))}
      </div>
      {picked !== null && (
        <p className="muted small">
          <span className={picked === q.answerIndex ? 'good' : 'bad-text'}>
            {picked === q.answerIndex ? '正解！ ' : '不正解。正しくは'}
          </span>
          「{target.word}」=「{q.choices[q.answerIndex]}」。例：{target.examples[0]?.en}
        </p>
      )}
    </div>
  );
}
