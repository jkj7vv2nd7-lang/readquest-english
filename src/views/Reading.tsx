import { useState } from 'react';
import type { ProgressState } from '../types';
import { READINGS } from '../data/readings';
import { LEVEL_LABEL, QUESTION_KIND_LABEL } from '../types';
import { gradeReading } from '../lib/gameLogic';
import { speakEnglish, speechSupported } from '../lib/speech';

export function ReadingView({
  level, onRecord,
}: {
  progress: ProgressState; level: number;
  onRecord: (r: { game: 'reading'; readingId: string; correct: boolean; answer?: string }) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showJa, setShowJa] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [graded, setGraded] = useState(false);

  const list = READINGS.filter((r) => r.level <= level);
  const entry = READINGS.find((r) => r.id === selectedId);

  const open = (id: string) => {
    setSelectedId(id);
    setAnswers([]);
    setGraded(false);
    setShowJa(false);
    window.scrollTo({ top: 0 });
  };

  const grade = () => {
    if (!entry) return;
    const { score, total } = gradeReading(entry, answers);
    setGraded(true);
    onRecord({ game: 'reading', readingId: entry.id, correct: score === total, answer: `${score}/${total}` });
  };

  if (!entry) {
    return (
      <div className="stack">
        <div className="card">
          <h2>リーディング</h2>
          <p className="muted">短文から新聞スタイルまで段階的に。まず文脈推測→選択→解説の流れで学びます。</p>
        </div>
        {list.map((r) => (
          <button key={r.id} className="card card-btn" onClick={() => open(r.id)}>
            <strong>{r.title}</strong> <span className="muted">— {r.titleJa}</span>
            <div className="muted small">Lv{r.level} {LEVEL_LABEL[r.level]} ／ 設問{r.questions.length}問</div>
          </button>
        ))}
      </div>
    );
  }

  const { score, total } = gradeReading(entry, answers);

  return (
    <div className="stack">
      <button className="btn link" onClick={() => setSelectedId(null)}>← 教材一覧に戻る</button>
      <div className="card">
        <h2>{entry.title}</h2>
        <p className="muted">{entry.titleJa} ／ Lv{entry.level}</p>
        {speechSupported() && (
          <button className="btn" onClick={() => speakEnglish(entry.body.join(' '))}>本文を読み上げる</button>
        )}
        <div className="reading-body">
          {entry.body.map((p, i) => (
            <div key={i} className="para">
              <p className="ex-en">{p}</p>
              {showJa && <p className="ex-ja">{entry.bodyJa[i]}</p>}
            </div>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={showJa} onChange={(e) => setShowJa(e.target.checked)} /> 日本語訳を表示（まずは英語だけで挑戦推奨）</label>
        <h3>重要語句</h3>
        {entry.vocab.map((v, i) => (
          <p key={i} className="list-row"><strong>{v.word}</strong> <span className="muted">— {v.meaning}</span>
            {speechSupported() && <button className="btn small" onClick={() => speakEnglish(v.word)}>音声</button>}</p>
        ))}
      </div>
      <div className="card">
        <h3>内容理解問題（文脈推測の練習）</h3>
        {entry.questions.map((qu, qi) => (
          <div key={qi} className="quiz">
            <p><span className="qkind">{QUESTION_KIND_LABEL[qu.kind ?? 'detail']}</span> <strong>Q{qi + 1}. {qu.q}</strong></p>
            <div className="choices">
              {qu.choices.map((c, ci) => (
                <button key={ci} disabled={graded}
                  className={`choice${answers[qi] === ci ? ' selected' : ''}${graded && ci === qu.answer ? ' correct' : ''}${graded && answers[qi] === ci && ci !== qu.answer ? ' wrong' : ''}`}
                  onClick={() => setAnswers((a) => { const n = [...a]; n[qi] = ci; return n; })}>{c}</button>
              ))}
            </div>
            {graded && <p className={`small ${answers[qi] === qu.answer ? 'good' : 'bad-text'}`}>{answers[qi] === qu.answer ? '正解！ ' : '不正解。正解は「' + qu.choices[qu.answer] + '」。'}{qu.explanation}</p>}
          </div>
        ))}
        {!graded
          ? <button className="btn primary" disabled={answers.length < entry.questions.length || answers.some((a) => a === undefined)} onClick={grade}>採点する</button>
          : <div className="feedback"><p><strong>得点：{score} / {total}</strong></p><div className="btn-row"><button className="btn" onClick={() => { setAnswers([]); setGraded(false); }}>解き直す</button><button className="btn" onClick={() => setSelectedId(null)}>一覧に戻る</button></div></div>}
      </div>
    </div>
  );
}
