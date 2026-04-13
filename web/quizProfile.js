import { QUIZ, QUIZ_FIELD_NAMES, QUIZ_VALUE_LABELS } from '/quizData.js';

const PREFS_KEY = 'etiove_quiz_prefs';
const SAVED_AT_KEY = 'etiove_quiz_saved_at';

export function loadQuizProfile() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;

    const prefs = JSON.parse(raw);
    if (!prefs || Object.keys(prefs).length !== QUIZ.length) return null;
    return prefs;
  } catch (_) {
    return null;
  }
}

export function saveQuizProfile(prefs) {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(SAVED_AT_KEY, savedAt);
  } catch (_) {
    /* no-op */
  }
}

export function clearQuizProfile() {
  try {
    localStorage.removeItem(PREFS_KEY);
    localStorage.removeItem(SAVED_AT_KEY);
  } catch (_) {
    /* no-op */
  }
}

export function renderQuizSummary(prefs) {
  return Object.entries(prefs).map(([key, value]) => {
    const label = (QUIZ_VALUE_LABELS[key] && QUIZ_VALUE_LABELS[key][value]) || value;
    const name = QUIZ_FIELD_NAMES[key] || key;

    return `<div class="eq-summary-pill"><span class="eq-summary-key">${name}</span><span class="eq-summary-val">${label}</span></div>`;
  }).join('');
}
