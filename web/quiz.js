import { QUIZ, QUIZ_STEP_NUMERALS } from '/quizData.js';
import {
  clearQuizProfile,
  loadQuizProfile,
  renderQuizSummary,
  saveQuizProfile,
} from '/quizProfile.js';
import { ensureQuizStyles } from '/quizStyles.js';

function renderQuiz() {
  const root = document.getElementById('webQuizRoot');
  if (!root) return;
  if (root.dataset.quizMounted === 'true') return;
  root.dataset.quizMounted = 'true';

  ensureQuizStyles();

  let step = 0;
  let prefs = {};

  function renderWelcome(inner) {
    const savedPrefs = loadQuizProfile();
    const hasProfile = savedPrefs && Object.keys(savedPrefs).length === QUIZ.length;

    if (hasProfile) {
      inner.innerHTML = `
        <span class="eq-eyebrow">Tu perfil guardado · Etiove</span>
        <h2 class="eq-title" style="white-space:nowrap;">Ya conocemos <em>tu café ideal</em></h2>
        <div class="eq-summary-row">${renderQuizSummary(savedPrefs)}</div>
        <p class="eq-sub" style="margin-top:20px;">Descarga Etiove para ver los cafés que encajan exactamente con tu perfil.</p>
        <div class="eq-divider"><span class="eq-divider-glyph">✦</span></div>
        <div class="eq-final-actions">
          <a class="eq-btn-primary" href="https://etiove.com/app" target="_blank" rel="noopener noreferrer">
            Descargar Etiove
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <button class="eq-btn-text" id="eq-redo">Rehacer el quiz</button>
        </div>
      `;

      inner.querySelector('#eq-redo').onclick = () => {
        clearQuizProfile();
        prefs = {};
        step = 1;
        render();
      };
      return;
    }

    inner.innerHTML = `
      <span class="eq-eyebrow">Quiz de sabor · Etiove</span>
      <h2 class="eq-title">¿Cuál es <em>tu</em> café ideal?</h2>
      <p class="eq-sub">Cuatro preguntas. Tu perfil sensorial exacto.<br>Descubre en la app los cafés que están esperándote.</p>
      <div class="eq-divider"><span class="eq-divider-glyph">✦</span></div>
      <button class="eq-btn-primary" id="eq-start">
        Comenzar el quiz
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    `;
    inner.querySelector('#eq-start').onclick = () => {
      step = 1;
      render();
    };
  }

  function renderCompletion(inner) {
    saveQuizProfile(prefs);

    inner.innerHTML = `
      <span class="eq-eyebrow">Perfil completado · Etiove</span>
      <h2 class="eq-title">Tu café perfecto <em>te está esperando</em></h2>
      <div class="eq-summary-row">${renderQuizSummary(prefs)}</div>
      <p class="eq-sub" style="margin-top:24px;">Perfil sensorial guardado. Descarga Etiove para ver los cafés que encajan exactamente con él.</p>
      <div class="eq-final-actions">
        <a class="eq-btn-primary" href="https://etiove.com/app" target="_blank" rel="noopener noreferrer">
          Descargar Etiove
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <button class="eq-btn-text" id="eq-restart">Repetir el quiz</button>
      </div>
    `;

    inner.querySelector('#eq-restart').onclick = () => {
      step = 0;
      prefs = {};
      render();
    };
  }

  function renderQuestion(inner) {
    const question = QUIZ[step - 1];

    let progressHtml = '';
    for (let i = 0; i <= QUIZ.length; i += 1) {
      if (i > 0) progressHtml += `<div class="eq-prog-seg${i <= step ? ' active' : ''}"></div>`;
      const cls = i < step ? 'done' : i === step ? 'current' : '';
      progressHtml += `<div class="eq-prog-node${cls ? ` ${cls}` : ''}"></div>`;
    }

    const cols = question.opciones.length === 3 ? 'cols-3' : '';
    const optionsHtml = question.opciones
      .map(
        (option, index) => `
      <button class="eq-option" data-value="${option.value}">
        <span class="eq-option-num">${QUIZ_STEP_NUMERALS[index]}</span>
        <span class="eq-option-label">${option.label}</span>
        <span class="eq-option-desc">${option.desc}</span>
      </button>
    `
      )
      .join('');

    inner.innerHTML = `
      <div class="eq-progress">${progressHtml}</div>
      <span class="eq-q-label">Pregunta ${step} de ${QUIZ.length}</span>
      <h3 class="eq-question">${question.pregunta}</h3>
      <p class="eq-q-nota">${question.nota}</p>
      <div class="eq-options ${cols}">${optionsHtml}</div>
      <div class="eq-foot">
        <button class="eq-btn-ghost" id="eq-back" ${step === 1 ? 'disabled' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Anterior
        </button>
        <span class="eq-foot-counter">${step} · ${QUIZ.length}</span>
      </div>
    `;

    inner.querySelectorAll('.eq-option').forEach((button) => {
      button.onclick = () => {
        inner
          .querySelectorAll('.eq-option')
          .forEach((optionButton) => optionButton.classList.remove('selected'));
        button.classList.add('selected');
        prefs[question.id] = button.dataset.value;
        setTimeout(() => {
          step += 1;
          render();
        }, 320);
      };
    });

    const back = inner.querySelector('#eq-back');
    if (back && !back.disabled) {
      back.onclick = () => {
        step -= 1;
        render();
      };
    }
  }

  function render() {
    root.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'eq-inner eq-screen';
    root.appendChild(inner);

    if (step === 0) {
      renderWelcome(inner);
      return;
    }

    if (step > QUIZ.length) {
      renderCompletion(inner);
      return;
    }

    renderQuestion(inner);
  }

  render();
}

export function initQuiz() {
  renderQuiz();
}
