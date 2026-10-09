import { useCallback, useEffect, useState } from 'react';
import type { GameKind, GameResult, ProgressState } from './types';
import { clearProgress, defaultProgress, loadProgress, recordResult, saveProgress } from './lib/storage';
import { HomeView, type Tab } from './views/Home';
import { WordsView } from './views/Words';
import { GamesView } from './views/Games';
import { ReviewView } from './views/Review';
import { ReadingView } from './views/Reading';
import { StatsView } from './views/Stats';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'ホーム', icon: '🏠' },
  { id: 'words', label: '単語', icon: '📖' },
  { id: 'games', label: 'ゲーム', icon: '🎮' },
  { id: 'review', label: '復習', icon: '🔁' },
  { id: 'reading', label: '読解', icon: '📚' },
  { id: 'stats', label: '記録', icon: '⚙️' },
];

export default function App() {
  // 初回読み込みはレンダー時に初期化（localStorage同期のため）
  const [initial] = useState(() => loadProgress());
  const [progress, setProgress] = useState<ProgressState>(initial.state);
  const [corrupted] = useState(initial.corrupted);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [wordFocus, setWordFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.body.dataset.fontsize = progress.fontSize;
  }, [progress.fontSize]);

  const commit = useCallback((next: ProgressState) => {
    setProgress(next);
    const r = saveProgress(next);
    setSaveError(r.ok ? null : (r.error ?? '保存失敗'));
  }, []);

  const handleRecord = useCallback(
    (r: Omit<GameResult, 'id' | 'date'>) => {
      setProgress((prev) => {
        const next = recordResult(prev, r);
        const res = saveProgress(next);
        setSaveError(res.ok ? null : (res.error ?? '保存失敗'));
        return next;
      });
    },
    [],
  );

  const openWord = useCallback((id: string) => {
    setWordFocus(id);
    setTab('words');
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="logo">ReadQuest English</h1>
          <p className="catch">英単語から、英語で本を読む力へ。</p>
        </div>
        <span className="lv">Lv{progress.level}</span>
      </header>

      <main className="main">
        {tab === 'home' && <HomeView progress={progress} nav={{ go: setTab, openWord }} />}
        {tab === 'words' && (
          <WordsView
            key={wordFocus}
            progress={progress}
            level={progress.level}
            initialWordId={wordFocus}
            onOpenWord={setWordFocus}
            onRecord={(r) => handleRecord(r as Omit<GameResult, 'id' | 'date'>)}
          />
        )}
        {tab === 'games' && <GamesView progress={progress} level={progress.level} onRecord={(r: { game: GameKind; wordId: string; correct: boolean; answer?: string }) => handleRecord(r)} />}
        {tab === 'review' && <ReviewView progress={progress} onRecord={(r) => handleRecord(r)} onOpenWord={openWord} />}
        {tab === 'reading' && <ReadingView progress={progress} level={progress.level} onRecord={(r) => handleRecord(r)} />}
        {tab === 'stats' && (
          <StatsView
            progress={progress}
            saveError={saveError}
            corrupted={corrupted}
            onSettings={(patch) => commit({ ...progress, ...patch })}
            onReset={() => { clearProgress(); setProgress(defaultProgress()); }}
          />
        )}
      </main>

      <nav className="bottomnav" aria-label="メインナビ">
        {TABS.map((t) => (
          <button key={t.id} className={`navbtn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="navicon">{t.icon}</span>
            <span className="navlabel">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
