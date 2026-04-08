// Etiove · Quiz de Sabor — web premium

const QUIZ = [
  {
    id: 'tueste',
    pregunta: '¿Qué tueste prefieres?',
    nota: 'El tueste define el carácter de cada taza',
    opciones: [
      { label: 'Claro',  desc: 'Floral · Ácido · Delicado',      value: 'claro'  },
      { label: 'Medio',  desc: 'Equilibrado · Versátil · Limpio', value: 'medio'  },
      { label: 'Oscuro', desc: 'Intenso · Denso · Ahumado',       value: 'oscuro' },
    ],
  },
  {
    id: 'origen',
    pregunta: '¿Qué origen te atrae?',
    nota: 'El origen marca el alma del grano',
    opciones: [
      { label: 'África',      desc: 'Etiopía · Kenia · Ruanda',       value: 'africa'     },
      { label: 'América',     desc: 'Colombia · Costa Rica · Panamá', value: 'america'    },
      { label: 'Asia',        desc: 'Indonesia · Yemen · India',       value: 'asia'       },
      { label: 'Sorpréndeme', desc: 'Cualquier origen',               value: 'cualquiera' },
    ],
  },
  {
    id: 'acidez',
    pregunta: '¿Cómo te gusta la acidez?',
    nota: 'La acidez es viveza, no agresividad',
    opciones: [
      { label: 'Alta',  desc: 'Brillante · Viva · Expresiva',    value: 'alta'  },
      { label: 'Media', desc: 'Equilibrada · Presente · Limpia', value: 'media' },
      { label: 'Baja',  desc: 'Suave · Redonda · Envolvente',    value: 'baja'  },
    ],
  },
  {
    id: 'sabor',
    pregunta: '¿Qué perfil te seduce?',
    nota: 'Cada taza es un universo de matices',
    opciones: [
      { label: 'Floral',    desc: 'Jazmín · Rosa · Bergamota',     value: 'floral'    },
      { label: 'Frutal',    desc: 'Cereza · Arándano · Naranja',   value: 'frutal'    },
      { label: 'Chocolate', desc: 'Cacao · Caramelo · Nuez',       value: 'chocolate' },
      { label: 'Especias',  desc: 'Canela · Cardamomo · Vainilla', value: 'especias'  },
    ],
  },
];

const STYLES = `
  #webQuizRoot, #webQuizRoot * { box-sizing: border-box; margin: 0; padding: 0; }

  #webQuizRoot {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 40px 120px;
    background: #1a0f08;
    color: #fff9f1;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  #webQuizRoot::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%,   rgba(143,94,59,0.20) 0%, transparent 70%),
      radial-gradient(ellipse 60% 50% at 15% 100%,  rgba(93,64,48,0.14) 0%, transparent 65%),
      radial-gradient(ellipse 50% 40% at 90% 60%,   rgba(143,94,59,0.09) 0%, transparent 60%);
    pointer-events: none;
  }

  #webQuizRoot::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(228,195,164,0.3) 30%, rgba(228,195,164,0.3) 70%, transparent);
    pointer-events: none;
  }

  .eq-inner {
    width: 100%;
    max-width: 700px;
    position: relative;
    z-index: 1;
  }

  .eq-screen {
    animation: eq-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes eq-rise {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .eq-eyebrow {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(205,165,120,0.7);
    margin-bottom: 22px;
    display: block;
  }

  .eq-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(40px, 6vw, 66px);
    font-weight: 300;
    color: #fff9f1;
    line-height: 1.08;
    letter-spacing: 0.5px;
    margin-bottom: 22px;
  }
  .eq-title em {
    font-style: italic;
    color: rgba(228,195,164,0.9);
  }

  .eq-sub {
    font-size: 15px;
    color: rgba(255,249,241,0.5);
    font-weight: 300;
    line-height: 1.85;
    max-width: 460px;
    margin-bottom: 48px;
    letter-spacing: 0.2px;
  }

  .eq-divider {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 48px;
    max-width: 300px;
  }
  .eq-divider::before, .eq-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(228,195,164,0.2);
  }
  .eq-divider-glyph {
    font-size: 12px;
    color: rgba(205,165,120,0.5);
  }

  /* BOTÓN — grande, cálido, legible */
  .eq-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    background: #e8d5be;
    color: #1a0f08;
    border: none;
    padding: 20px 48px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
    font-family: inherit;
    text-decoration: none;
  }
  .eq-btn-primary:hover {
    background: #f5e6cf;
    transform: translateY(-3px);
    box-shadow: 0 20px 48px rgba(0,0,0,0.45);
  }
  .eq-btn-primary svg { transition: transform 0.3s; flex-shrink: 0; }
  .eq-btn-primary:hover svg { transform: translateX(5px); }

  .eq-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: rgba(255,249,241,0.35);
    border: none;
    padding: 10px 0;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    font-family: inherit;
    transition: color 0.25s;
  }
  .eq-btn-ghost:hover { color: rgba(255,249,241,0.7); }
  .eq-btn-ghost:disabled { opacity: 0; pointer-events: none; }

  /* PROGRESO */
  .eq-progress {
    display: flex;
    align-items: center;
    margin-bottom: 52px;
    width: 100%;
  }
  .eq-prog-seg {
    flex: 1;
    height: 1px;
    background: rgba(228,195,164,0.12);
    transition: background 0.5s;
  }
  .eq-prog-seg.active { background: rgba(228,195,164,0.55); }
  .eq-prog-node {
    width: 7px; height: 7px;
    border-radius: 50%;
    border: 1px solid rgba(228,195,164,0.2);
    background: transparent;
    flex-shrink: 0;
    transition: all 0.3s;
  }
  .eq-prog-node.done {
    background: rgba(228,195,164,0.6);
    border-color: rgba(228,195,164,0.6);
  }
  .eq-prog-node.current {
    border-color: rgba(228,195,164,0.8);
    box-shadow: 0 0 0 4px rgba(228,195,164,0.1);
  }

  /* PREGUNTA */
  .eq-q-label {
    font-size: 10px;
    letter-spacing: 3.5px;
    text-transform: uppercase;
    color: rgba(205,165,120,0.65);
    font-weight: 500;
    margin-bottom: 14px;
    display: block;
  }
  .eq-question {
    font-family: 'Playfair Display', serif;
    font-size: clamp(30px, 4.5vw, 44px);
    font-weight: 400;
    color: #fff9f1;
    line-height: 1.18;
    margin-bottom: 10px;
    letter-spacing: 0.3px;
  }
  .eq-q-nota {
    font-size: 13px;
    color: rgba(255,249,241,0.32);
    font-weight: 300;
    font-style: italic;
    margin-bottom: 36px;
  }

  /* OPCIONES — fondo cálido visible, borde legible */
  .eq-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 36px;
  }
  .eq-options.cols-3 { grid-template-columns: repeat(3, 1fr); }

  .eq-option {
    background: rgba(228,195,164,0.10);
    border: 1px solid rgba(228,195,164,0.32);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    padding: 26px 24px 22px;
    transition: border-color 0.25s, background 0.25s, transform 0.22s, box-shadow 0.25s;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }
  .eq-option::after {
    content: '';
    position: absolute;
    top: 16px; bottom: 16px; left: 0;
    width: 2px;
    background: rgba(228,195,164,0.7);
    border-radius: 0 2px 2px 0;
    opacity: 0;
    transition: opacity 0.22s, transform 0.22s;
    transform: scaleY(0.4);
    transform-origin: center;
  }
  .eq-option:hover {
    border-color: rgba(228,195,164,0.7);
    background: rgba(228,195,164,0.16);
    transform: translateY(-4px);
    box-shadow: 0 12px 36px rgba(0,0,0,0.3);
  }
  .eq-option:hover::after { opacity: 1; transform: scaleY(1); }
  .eq-option:active { transform: translateY(-1px); }

  .eq-option-num {
    font-family: 'Playfair Display', serif;
    font-size: 10px;
    color: rgba(205,165,120,0.45);
    letter-spacing: 2px;
    font-weight: 400;
  }
  .eq-option-label {
    font-family: 'Playfair Display', serif;
    font-size: clamp(20px, 2.8vw, 24px);
    font-weight: 400;
    color: #fff9f1;
    letter-spacing: 0.3px;
    line-height: 1.1;
  }
  .eq-option-desc {
    font-size: 12px;
    color: rgba(255,249,241,0.65);
    font-weight: 300;
    letter-spacing: 0.6px;
    line-height: 1.6;
    margin-top: 2px;
  }

  /* PIE */
  .eq-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(228,195,164,0.1);
    padding-top: 22px;
  }
  .eq-foot-counter {
    font-family: 'Playfair Display', serif;
    font-size: 13px;
    color: rgba(255,249,241,0.18);
    letter-spacing: 3px;
    font-style: italic;
  }

  /* FINAL */
  .eq-footer-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid rgba(228,195,164,0.15);
  }
  .eq-footer-link {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,249,241,0.45);
    text-decoration: none;
    transition: color 0.2s;
  }
  .eq-footer-link:hover { color: rgba(255,249,241,0.85); }
  .eq-footer-sep {
    font-size: 10px;
    color: rgba(255,249,241,0.2);
  }
  .eq-final-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    margin-top: 48px;
  }

  .eq-btn-text {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,249,241,0.28);
    font-family: inherit;
    padding: 0;
    transition: color 0.25s;
  }
  .eq-btn-text:hover { color: rgba(255,249,241,0.6); }

  .eq-summary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 24px;
  }
  .eq-summary-pill {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 18px;
    background: rgba(255,249,241,0.06);
    border: 1px solid rgba(228,195,164,0.22);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #f4dfc8;
    min-width: 80px;
  }
  .eq-summary-key {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(205,165,120,0.6);
    display: block;
  }

  @media (max-width: 600px) {
    #webQuizRoot { padding: 80px 24px 100px; min-height: auto; }
    .eq-options, .eq-options.cols-3 { grid-template-columns: 1fr; }
    .eq-btn-primary { padding: 18px 36px; width: 100%; justify-content: center; }
  }
`;

function renderQuiz() {
  const root = document.getElementById('webQuizRoot');
  if (!root) return;

  if (!document.getElementById('eq-styles')) {
    const s = document.createElement('style');
    s.id = 'eq-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  let step = 0;
  let prefs = {};
  const NUMS = ['I', 'II', 'III', 'IV'];

  function render() {
    root.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'eq-inner eq-screen';
    root.appendChild(inner);

    if (step === 0) {
      // Recuperar perfil previo si existe
      let savedPrefs = null;
      try {
        const raw = localStorage.getItem('etiove_quiz_prefs');
        if (raw) savedPrefs = JSON.parse(raw);
      } catch (_) {}

      const hasProfile = savedPrefs && Object.keys(savedPrefs).length === QUIZ.length;

      if (hasProfile) {
        // Mostrar perfil guardado con opción de rehacerlo
        const LABELS = {
          tueste:  { claro: 'Claro', medio: 'Medio', oscuro: 'Oscuro' },
          origen:  { africa: 'África', america: 'América', asia: 'Asia', cualquiera: 'Sorpréndeme' },
          acidez:  { alta: 'Alta', media: 'Media', baja: 'Baja' },
          sabor:   { floral: 'Floral', frutal: 'Frutal', chocolate: 'Chocolate', especias: 'Especias' },
        };
        const summaryHTML = Object.entries(savedPrefs).map(([key, val]) => {
          const label = (LABELS[key] && LABELS[key][val]) || val;
          const names = { tueste: 'Tueste', origen: 'Origen', acidez: 'Acidez', sabor: 'Perfil' };
          return `<span class="eq-summary-pill"><span class="eq-summary-key">${names[key] || key}</span>${label}</span>`;
        }).join('');

        inner.innerHTML = `
          <span class="eq-eyebrow">Tu perfil guardado · Etiove</span>
          <h2 class="eq-title">Ya conocemos <em>tu café ideal</em></h2>
          <div class="eq-summary-row">${summaryHTML}</div>
          <p class="eq-sub" style="margin-top:20px;">Descarga Etiove para ver los cafés que encajan exactamente con tu perfil.</p>
          <div class="eq-divider"><span class="eq-divider-glyph">✦</span></div>
          <div class="eq-final-actions">
            <a class="eq-btn-primary" href="https://etiove.com/app" target="_blank">
              Descargar Etiove
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <button class="eq-btn-text" id="eq-redo">Rehacer el quiz</button>
          </div>
        `;
        inner.querySelector('#eq-redo').onclick = () => {
          try { localStorage.removeItem('etiove_quiz_prefs'); localStorage.removeItem('etiove_quiz_saved_at'); } catch(_) {}
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
      inner.querySelector('#eq-start').onclick = () => { step = 1; render(); };
      return;
    }

    if (step > QUIZ.length) {
      // Guardar perfil en localStorage
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem('etiove_quiz_prefs', JSON.stringify(prefs));
        localStorage.setItem('etiove_quiz_saved_at', savedAt);
      } catch (_) {}

      // Etiquetas legibles para mostrar el resumen
      const LABELS = {
        tueste:  { claro: 'Claro', medio: 'Medio', oscuro: 'Oscuro' },
        origen:  { africa: 'África', america: 'América', asia: 'Asia', cualquiera: 'Sorpréndeme' },
        acidez:  { alta: 'Alta', media: 'Media', baja: 'Baja' },
        sabor:   { floral: 'Floral', frutal: 'Frutal', chocolate: 'Chocolate', especias: 'Especias' },
      };
      const summaryHTML = Object.entries(prefs).map(([key, val]) => {
        const label = (LABELS[key] && LABELS[key][val]) || val;
        const names = { tueste: 'Tueste', origen: 'Origen', acidez: 'Acidez', sabor: 'Perfil' };
        return `<span class="eq-summary-pill"><span class="eq-summary-key">${names[key] || key}</span>${label}</span>`;
      }).join('');

      inner.innerHTML = `
        <span class="eq-eyebrow">Perfil completado</span>
        <h2 class="eq-title">Tu café perfecto<br><em>te está esperando</em></h2>
        <div class="eq-summary-row">${summaryHTML}</div>
        <p class="eq-sub" style="margin-top:20px;">Hemos guardado tu perfil sensorial. Descarga Etiove para ver los cafés que encajan exactamente con él.</p>
        <div class="eq-final-actions">
          <a class="eq-btn-primary" href="https://etiove.com/app" target="_blank">
            Descargar Etiove
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <button class="eq-btn-text" id="eq-restart">Repetir el quiz</button>
        </div>
        <nav class="eq-footer-nav">
          <a class="eq-footer-link" href="/comunidad.html">Comunidad</a>
          <span class="eq-footer-sep">·</span>
          <a class="eq-footer-link" href="/blog/">Blog</a>
          <span class="eq-footer-sep">·</span>
          <a class="eq-footer-link" href="/">Inicio</a>
        </nav>
      `;
      inner.querySelector('#eq-restart').onclick = () => { step = 0; prefs = {}; render(); };
      return;
    }

    const q = QUIZ[step - 1];

    let progHTML = '';
    for (let i = 0; i <= QUIZ.length; i++) {
      if (i > 0) progHTML += `<div class="eq-prog-seg${i <= step ? ' active' : ''}"></div>`;
      const cls = i < step ? 'done' : i === step ? 'current' : '';
      progHTML += `<div class="eq-prog-node${cls ? ' ' + cls : ''}"></div>`;
    }

    const cols = q.opciones.length === 3 ? 'cols-3' : '';
    const optsHTML = q.opciones.map((op, i) => `
      <button class="eq-option" data-value="${op.value}">
        <span class="eq-option-num">${NUMS[i]}</span>
        <span class="eq-option-label">${op.label}</span>
        <span class="eq-option-desc">${op.desc}</span>
      </button>
    `).join('');

    inner.innerHTML = `
      <div class="eq-progress">${progHTML}</div>
      <span class="eq-q-label">Pregunta ${step} de ${QUIZ.length}</span>
      <h3 class="eq-question">${q.pregunta}</h3>
      <p class="eq-q-nota">${q.nota}</p>
      <div class="eq-options ${cols}">${optsHTML}</div>
      <div class="eq-foot">
        <button class="eq-btn-ghost" id="eq-back" ${step === 1 ? 'disabled' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Anterior
        </button>
        <span class="eq-foot-counter">${step} · ${QUIZ.length}</span>
      </div>
    `;

    inner.querySelectorAll('.eq-option').forEach(btn => {
      btn.onclick = () => { prefs[q.id] = btn.dataset.value; step++; render(); };
    });
    const back = inner.querySelector('#eq-back');
    if (back && !back.disabled) back.onclick = () => { step--; render(); };
  }

  render();
}

document.addEventListener('DOMContentLoaded', renderQuiz);
