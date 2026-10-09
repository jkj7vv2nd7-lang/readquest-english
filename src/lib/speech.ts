// 音声読み上げ（Web Speech API）。外部API不要・無料。
// 未対応ブラウザでは no-op になり、呼び出し側は対応可否で表示を切り替える。

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// M4修正：一部ブラウザは初回 getVoices() が空のため、voiceschanged で温めておく
let voicesWarmed = false;
function warmVoices(): void {
  if (!speechSupported() || voicesWarmed) return;
  voicesWarmed = true;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch { /* ignore */ }
    };
  } catch { /* ignore */ }
}
warmVoices();

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? null;
  } catch {
    return null;
  }
}

export function speakEnglish(text: string, slow = false): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = slow ? 0.7 : 0.95;
    // 英語音声を優先（取得失敗時は既定音声に任せる）
    const en = pickEnglishVoice();
    if (en) u.voice = en;
    u.onerror = () => { /* 音声失敗は学習を止めない */ };
    window.speechSynthesis.speak(u);
  } catch {
    // 音声失敗は学習を止めない
  }
}

export function stopSpeech(): void {
  if (speechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch { /* ignore */ }
  }
}
