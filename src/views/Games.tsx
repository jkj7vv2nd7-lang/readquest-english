import { useMemo, useRef, useState } from 'react';
import type { GameKind, ProgressState } from '../types';
import { WORDS } from '../data/words';
import { judgeHunter, judgeMatch, judgeSpelling, makeHunterQuestion, makeMatchPairs, pick, type MatchPairs } from '../lib/gameLogic';
import { speakEnglish, speechSupported } from '../lib/speech';

const GAMES: { kind: GameKind; name: string; desc: string }[] = [
  { kind: 'hunter', name: '意味ハンター', desc: '英単語に対応する意味を選ぶ' },
  { kind: 'spell', name: 'スペル工房', desc: '意味を手がかりに英単語を入力' },
  { kind: 'listening', name: 'リスニング探偵', desc: '音声を聞いて意味を当てる' },
  { kind: 'match', name: '単語ペアマッチ', desc: '英単語と意味を対応させる' },
];

export function GamesView({
  progress: _progress, level, onRecord,
}: {
  progress: ProgressState; level: number;
  onRecord: (r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => void;
}) {
  const [kind, setKind] = useState<GameKind | null>(null);
  const pool = useMemo(() => WORDS.filter((w) => w.level <= level), [level]);

  if (pool.length < 2) return <div className="card"><p>問題データが不足しています。学習レベルを上げると遊べます。</p></div>;

  return (
    <div className="stack">
      {!kind && (
        <div className="card">
          <h2>学習ゲーム</h2>
          <div className="game-grid">
            {GAMES.map((g) => (
              <button key={g.kind} className="game-card" onClick={() => setKind(g.kind)}>
                <strong>{g.name}</strong><span className="muted">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {kind && (
        <div>
          <button className="btn link" onClick={() => setKind(null)}>← ゲーム選択に戻る</button>
          {kind === 'hunter' && <Hunter pool={pool} onRecord={onRecord} />}
          {kind === 'spell' && <Spell pool={pool} onRecord={onRecord} />}
          {kind === 'listening' && <Listening pool={pool} onRecord={onRecord} />}
          {kind === 'match' && <Match pool={pool} onRecord={onRecord} />}
        </div>
      )}
    </div>
  );
}

function useRound<T>(pool: T[], n = 5) {
  const [rounds, setRounds] = useState<T[]>(() => pick(pool, n));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const next = (correct: boolean) => {
    if (correct) setScore((s) => s + 1);
    if (idx + 1 >= rounds.length) setDone(true);
    else setIdx((i) => i + 1);
  };
  // H3修正：全リロードせずセッション内で出題し直す
  const reset = () => {
    setRounds(pick(pool, n));
    setIdx(0);
    setScore(0);
    setDone(false);
  };
  return { rounds, idx, score, done, next, reset, total: rounds.length };
}

function ResultLine({ score, total, onRetry }: { score: number; total: number; onRetry: () => void }) {
  return (
    <div className="card">
      <h3>結果： {score} / {total} 正解</h3>
      <p className={score === total ? 'good' : score >= total / 2 ? '' : 'bad-text'}>
        {score === total ? '全問正解！すばらしい。' : score >= total / 2 ? 'よくできました。間違えた単語は復習へ。' : '間違えた単語を復習しましょう。'}
      </p>
      <button className="btn primary" onClick={onRetry}>もう一度遊ぶ</button>
    </div>
  );
}

function Hunter({ pool, onRecord }: { pool: typeof WORDS; onRecord: (r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => void }) {
  const r = useRound(pool);
  const [picked, setPicked] = useState<number | null>(null);
  const [salt, setSalt] = useState(0);
  const target = r.rounds[r.idx];
  const q = useMemo(() => {
    void salt; // 回答ごとに選択肢を再シャッフルするためのキー
    return target ? makeHunterQuestion(target, pool) : null;
  }, [target, pool, salt]);
  if (r.done) return <ResultLine score={r.score} total={r.total} onRetry={() => { setPicked(null); setSalt((s) => s + 1); r.reset(); }} />;
  if (!q || !target) return <div className="card"><p>問題を作成できませんでした。</p></div>;
  return (
    <div className="card">
      <p className="muted">第 {r.idx + 1} 問 / {r.total}（正解 {r.score}）</p>
      <h2>{target.word} <span className="muted small">{target.partOfSpeech} {target.ipa}</span></h2>
      <div className="choices">
        {q.choices.map((c, i) => (
          <button key={i} disabled={picked !== null} className={`choice${picked === i ? (i === q.answerIndex ? ' correct' : ' wrong') : ''}${picked !== null && i === q.answerIndex ? ' correct' : ''}`}
            onClick={() => {
              setPicked(i);
              const ok = judgeHunter(q, i);
              onRecord({ game: 'hunter', wordId: target.id, correct: ok, answer: c });
              setTimeout(() => { r.next(ok); setPicked(null); setSalt((s) => s + 1); }, 900);
            }}>{c}</button>
        ))}
      </div>
      {picked !== null && (
        <div className="feedback">
          <p className={picked === q.answerIndex ? 'good' : 'bad-text'}>{picked === q.answerIndex ? '正解！' : `不正解。正しくは「${q.choices[q.answerIndex]}」`}</p>
          <p className="muted small">例：{target.examples[0]?.en}（{target.examples[0]?.ja}）</p>
        </div>
      )}
    </div>
  );
}

function Spell({ pool, onRecord }: { pool: typeof WORDS; onRecord: (r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => void }) {
  const r = useRound(pool);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const target = r.rounds[r.idx];
  if (r.done) return <ResultLine score={r.score} total={r.total} onRetry={() => { setInput(''); setMsg(null); r.reset(); }} />;
  if (!target) return <div className="card"><p>問題を作成できませんでした。</p></div>;
  const judge = () => {
    if (msg !== null) return; // H2修正：連打による二重採点・二重記録を防止
    const ok = judgeSpelling(target, input);
    setMsg(ok ? '正解！' : `不正解。正しくは「${target.word}」です。`);
    onRecord({ game: 'spell', wordId: target.id, correct: ok, answer: input });
    setTimeout(() => { r.next(ok); setInput(''); setMsg(null); }, 1100);
  };
  return (
    <div className="card">
      <p className="muted">第 {r.idx + 1} 問 / {r.total}（正解 {r.score}）</p>
      <h2>{target.meanings.join('・')} <span className="muted small">（{target.partOfSpeech}・{target.ipa}）</span></h2>
      <p className="muted">例：{target.examples[0]?.ja}</p>
      <div className="row">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') judge(); }} placeholder="英単語を入力" aria-label="スペル回答" />
        <button className="btn primary" disabled={msg !== null} onClick={judge}>判定</button>
      </div>
      {msg && <p className={msg.startsWith('正解') ? 'good' : 'bad-text'}>{msg}</p>}
    </div>
  );
}

function Listening({ pool, onRecord }: { pool: typeof WORDS; onRecord: (r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => void }) {
  const r = useRound(pool);
  const [picked, setPicked] = useState<number | null>(null);
  const target = r.rounds[r.idx];
  const q = useMemo(() => (target ? makeHunterQuestion(target, pool) : null), [target, pool]);
  if (r.done) return <ResultLine score={r.score} total={r.total} onRetry={() => { setPicked(null); r.reset(); }} />;
  if (!q || !target) return <div className="card"><p>問題を作成できませんでした。</p></div>;
  return (
    <div className="card">
      <p className="muted">第 {r.idx + 1} 問 / {r.total}（正解 {r.score}）</p>
      <h2>音声を聞いて意味を選ぼう</h2>
      {speechSupported()
        ? <div className="btn-row"><button className="btn primary" onClick={() => speakEnglish(target.word)}>再生</button><button className="btn" onClick={() => speakEnglish(target.word, true)}>ゆっくり再生</button></div>
        : <p className="bad-text">この端末は音声読み上げに未対応のため、単語を見て回答してください：<strong>{target.word}</strong></p>}
      <div className="choices">
        {q.choices.map((c, i) => (
          <button key={i} disabled={picked !== null} className={`choice${picked === i ? (i === q.answerIndex ? ' correct' : ' wrong') : ''}${picked !== null && i === q.answerIndex ? ' correct' : ''}`}
            onClick={() => {
              setPicked(i);
              const ok = judgeHunter(q, i);
              onRecord({ game: 'listening', wordId: target.id, correct: ok, answer: c });
              setTimeout(() => { r.next(ok); setPicked(null); }, 900);
            }}>{c}</button>
        ))}
      </div>
      {picked !== null && <p className="muted small">正解は「{target.word} = {q.choices[q.answerIndex]}」でした。</p>}
    </div>
  );
}

function Match({ pool, onRecord }: { pool: typeof WORDS; onRecord: (r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => void }) {
  const [pairs, setPairs] = useState<MatchPairs | null>(() => makeMatchPairs(pick(pool, 8)));
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState(0);
  // H2修正：同一ティック内の二重発火を抑止する再入防止ロック
  const busyRef = useRef(false);
  if (!pairs) return <div className="card"><p>問題データが不足しています（2語以上必要）。</p></div>;
  const complete = found.length === pairs.left.length;
  const chooseRight = (rtId: string, rtText: string) => {
    if (!leftSel || busyRef.current || found.includes(leftSel)) return;
    busyRef.current = true;
    try {
      const ok = judgeMatch(pairs, leftSel, rtId);
      onRecord({ game: 'match', wordId: leftSel, correct: ok, answer: rtText });
      if (ok) setFound((f) => (f.includes(leftSel) ? f : [...f, leftSel]));
      else setMiss((m) => m + 1);
      setLeftSel(null);
    } finally {
      busyRef.current = false;
    }
  };
  return (
    <div className="card">
      <h2>単語ペアマッチ</h2>
      <p className="muted">左の英単語と右の意味を対応させよう（ミス {miss} 回）</p>
      <div className="match-grid">
        <div className="match-col">
          {pairs.left.map((l) => (
            <button key={l.id} disabled={found.includes(l.id)} className={`choice${leftSel === l.id ? ' selected' : ''}${found.includes(l.id) ? ' correct' : ''}`} onClick={() => setLeftSel(l.id)}>{found.includes(l.id) ? `✓ ${l.text}` : l.text}</button>
          ))}
        </div>
        <div className="match-col">
          {pairs.right.map((rt) => (
            <button key={rt.id} disabled={found.includes(rt.id)} className={`choice${found.includes(rt.id) ? ' correct' : ''}`} onClick={() => chooseRight(rt.id, rt.text)}>{found.includes(rt.id) ? `✓ ${rt.text}` : rt.text}</button>
          ))}
        </div>
      </div>
      {complete && <div className="feedback"><p className="good">完成！ミス {miss} 回でした。</p><button className="btn primary" onClick={() => { setPairs(makeMatchPairs(pick(pool, 8))); setFound([]); setMiss(0); }}>次のセット</button></div>}
    </div>
  );
}
