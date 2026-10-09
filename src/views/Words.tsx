import { useMemo, useState } from 'react';
import type { ProgressState } from '../types';
import { WORDS } from '../data/words';
import { LEVEL_LABEL } from '../types';
import { speakEnglish, speechSupported } from '../lib/speech';

export function WordsView({
  progress, level, onRecord, initialWordId, onOpenWord,
}: {
  progress: ProgressState;
  level: number;
  onRecord: (r: { game: 'study'; wordId: string; correct: boolean; answer?: string }) => void;
  initialWordId?: string;
  onOpenWord: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(initialWordId);
  const [spell, setSpell] = useState('');
  const [spellMsg, setSpellMsg] = useState<string | null>(null);
  const [showJa, setShowJa] = useState(true);

  const list = useMemo(() => {
    const base = WORDS.filter((w) => w.level <= level);
    const query = q.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (w) => w.word.toLowerCase().includes(query) || w.meanings.some((m) => m.includes(q.trim())),
    );
  }, [q, level]);

  const selected = WORDS.find((w) => w.id === (selectedId ?? initialWordId));

  const open = (id: string) => {
    setSelectedId(id);
    setSpell('');
    setSpellMsg(null);
    onOpenWord(id);
  };

  const checkSpell = () => {
    if (!selected || spellMsg) return; // H2修正：表示中の連打による二重記録を防止
    const ok = selected.word.toLowerCase() === spell.trim().toLowerCase();
    setSpellMsg(ok ? '正解！スペルを覚えました。' : `不正解。正しくは「${selected.word}」です。`);
    onRecord({ game: 'study', wordId: selected.id, correct: ok, answer: spell });
    // メッセージ表示中に再判定できないよう、入力変更でリセットする
  };

  return (
    <div className="stack">
      <div className="card">
        <h2>単語学習 <span className="muted small">（{LEVEL_LABEL[level]}まで・{list.length}語）</span></h2>
        <input
          className="input" placeholder="単語・意味で検索（例: eat / 食べる）"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="単語検索"
        />
        <div className="word-list">
          {list.map((w) => {
            const st = progress.wordStats[w.id];
            return (
              <button key={w.id} className={`word-row${selected?.id === w.id ? ' active' : ''}`} onClick={() => open(w.id)}>
                <span className="w-en">{w.word}</span>
                <span className="muted">{showJa ? w.meanings.join('・') : w.partOfSpeech}</span>
                {st && <span className={`badge ${st.lastResult === false ? 'bad' : 'ok'}`}>{st.lastResult === false ? '要復習' : `${st.correct}/${st.shown}`}</span>}
              </button>
            );
          })}
        </div>
        <label className="check"><input type="checkbox" checked={showJa} onChange={(e) => setShowJa(e.target.checked)} /> 意味を表示</label>
      </div>

      {selected && (
        <div className="card">
          <h2>{selected.word}</h2>
          <p className="muted">{selected.partOfSpeech} ／ {selected.ipa} ／ Lv{selected.level} {LEVEL_LABEL[selected.level]}</p>
          <p className="meanings">{selected.meanings.join(' ／ ')}</p>
          {speechSupported() ? (
            <div className="btn-row">
              <button className="btn" onClick={() => speakEnglish(selected.word)}>発音を聞く</button>
              <button className="btn" onClick={() => speakEnglish(selected.examples[0]?.en ?? selected.word, true)}>例文をゆっくり聞く</button>
            </div>
          ) : <p className="muted small">この端末は音声読み上げに未対応です。</p>}
          <div className="examples">
            {selected.examples.map((ex, i) => (
              <div key={i} className="example">
                <p className="ex-en">{ex.en}</p>
                <p className="ex-ja">{ex.ja}</p>
              </div>
            ))}
          </div>
          <div>
            <h3>スペル練習</h3>
            <p className="muted small">ヒント：{selected.meanings[0]}（{selected.partOfSpeech}）</p>
            <div className="row">
              <input className="input" value={spell} onChange={(e) => { setSpell(e.target.value); setSpellMsg(null); }} onKeyDown={(e) => { if (e.key === 'Enter') checkSpell(); }} placeholder="英単語を入力" aria-label="スペル入力" />
              <button className="btn primary" disabled={spellMsg !== null} onClick={checkSpell}>判定</button>
            </div>
            {spellMsg && <p className={spellMsg.startsWith('正解') ? 'good' : 'bad-text'}>{spellMsg}</p>}
          </div>
          <div>
            <h3>関連語句</h3>
            <p>{selected.collocations.join(' ／ ') || '—'}</p>
            <p className="muted small">タグ：{selected.tags.join(', ') || '—'}</p>
          </div>
          <div className="btn-row">
            <button className="btn ok-btn" onClick={() => onRecord({ game: 'study', wordId: selected.id, correct: true, answer: '覚えた' })}>覚えた</button>
            <button className="btn warn-btn" onClick={() => onRecord({ game: 'study', wordId: selected.id, correct: false, answer: 'まだ' })}>まだ覚えていない</button>
          </div>
        </div>
      )}
    </div>
  );
}
