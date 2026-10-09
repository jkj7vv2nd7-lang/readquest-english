import { useState } from 'react';
import type { ProgressState } from '../types';
import { accuracy, studyDayCount } from '../lib/storage';
import { LEVEL_LABEL } from '../types';
import { APP_VERSION } from '../version';

export function StatsView({
  progress, saveError, corrupted, onSettings, onReset,
}: {
  progress: ProgressState;
  saveError: string | null;
  corrupted: boolean;
  onSettings: (patch: Partial<Pick<ProgressState, 'dailyGoal' | 'level' | 'fontSize'>>) => void;
  onReset: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const days = Object.entries(progress.studyDays).sort().slice(-14);

  return (
    <div className="stack">
      <div className="card">
        <h2>学習記録</h2>
        <div className="grid2">
          <div><p className="muted">学習日数</p><p className="big">{studyDayCount(progress)} 日</p></div>
          <div><p className="muted">正答率</p><p className="big">{accuracy(progress)} %</p></div>
          <div><p className="muted">学習単語数</p><p className="big">{Object.keys(progress.wordStats).length}</p></div>
          <div><p className="muted">回答総数</p><p className="big">{progress.results.length}</p></div>
        </div>
        <h3>直近14日の学習数</h3>
        {days.length === 0 && <p className="muted">まだ記録がありません。</p>}
        <div className="bars">
          {days.map(([d, n]) => (
            <div key={d} className="mini-bar" title={`${d}: ${n}`}>
              <div className="mini-fill" style={{ height: `${Math.min(100, n * 10)}px` }} />
              <span className="small">{d.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>設定</h2>
        {corrupted && <p className="bad-text">保存データが壊れていたため初期化しました。</p>}
        {saveError && <p className="bad-text">保存に失敗しました：{saveError}（容量不足の可能性）</p>}
        <label className="setting">1日の目標（問）
          <input className="input" type="number" min={1} max={100} value={progress.dailyGoal}
            onChange={(e) => onSettings({ dailyGoal: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
        </label>
        <label className="setting">学習レベル
          <select className="input" value={progress.level} onChange={(e) => onSettings({ level: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Lv{l} {LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label className="setting">文字サイズ
          <select className="input" value={progress.fontSize} onChange={(e) => onSettings({ fontSize: e.target.value as ProgressState['fontSize'] })}>
            <option value="small">小</option>
            <option value="medium">中</option>
            <option value="large">大</option>
          </select>
        </label>
      </div>

      <div className="card danger">
        <h2>データ初期化</h2>
        <p className="muted">すべての学習履歴が消えます。この操作は取り消せません。</p>
        {!confirm
          ? <button className="btn warn-btn" onClick={() => setConfirm(true)}>データを初期化する</button>
          : <div className="btn-row">
            <p><strong>本当に削除しますか？</strong></p>
            <button className="btn warn-btn" onClick={() => { onReset(); setConfirm(false); }}>削除する</button>
            <button className="btn" onClick={() => setConfirm(false)}>キャンセル</button>
          </div>}
      </div>

      <p className="muted small center">ReadQuest English v{APP_VERSION}</p>
    </div>
  );
}
