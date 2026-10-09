import type { ProgressState } from '../types';
import { WORD_MAP } from '../data/words';
import { accuracy, dueWords, studyDayCount, todayCount } from '../lib/storage';
import { WORDS } from '../data/words';

export type Tab = 'home' | 'words' | 'games' | 'review' | 'reading' | 'stats';

export interface Nav {
  go: (t: Tab) => void;
  openWord: (id: string) => void;
}

export function HomeView({ progress, nav }: { progress: ProgressState; nav: Nav }) {
  const today = todayCount(progress);
  const goal = progress.dailyGoal;
  const pct = Math.min(100, Math.round((today / Math.max(1, goal)) * 100));
  const due = dueWords(progress, WORDS.map((w) => w.id), new Date(), 50);
  const last = progress.lastWordId ? WORD_MAP.get(progress.lastWordId) : undefined;

  return (
    <div className="stack">
      <section className="card hero-card">
        <p className="eyebrow">英単語から、英語で本を読む力へ。</p>
        <h2>今日の学習目標</h2>
        <div className="progress-row">
          <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
          <p className="num">{today} / {goal} 問</p>
        </div>
        {today >= goal ? <p className="good">目標達成！すばらしい継続です。</p> : <p className="muted">あと {goal - today} 問で達成です。</p>}
      </section>

      <section className="card">
        <h2>学習の続き</h2>
        {last ? (
          <div className="row-between">
            <div><strong>{last.word}</strong><span className="muted"> — {last.meanings[0]}</span></div>
            <button className="btn" onClick={() => nav.openWord(last.id)}>続ける</button>
          </div>
        ) : <p className="muted">まだ学習記録がありません。「単語」から始めましょう。</p>}
        <div className="btn-row">
          <button className="btn primary" onClick={() => nav.go('games')}>ゲームで学ぶ</button>
          <button className="btn" onClick={() => nav.go('reading')}>読解に進む</button>
        </div>
      </section>

      <section className="card">
        <h2>復習対象</h2>
        <p><strong>{due.length}</strong> 語が復習待ちです。</p>
        <button className="btn" onClick={() => nav.go('review')}>復習する</button>
      </section>

      <section className="card grid2">
        <div><p className="muted">学習日数</p><p className="big">{studyDayCount(progress)} 日</p></div>
        <div><p className="muted">正答率</p><p className="big">{accuracy(progress)} %</p></div>
        <div><p className="muted">学習した単語数</p><p className="big">{Object.keys(progress.wordStats).length} 語</p></div>
        <div><p className="muted">回答総数</p><p className="big">{progress.results.length} 問</p></div>
      </section>
    </div>
  );
}
