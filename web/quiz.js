// Etiove Web Quiz de Sabor
// Este archivo implementa el Quiz de Sabor como en la app, pero para la web.
// Al finalizar, invita a descargar la app para ver resultados y cafés recomendados.

// Preguntas del quiz (idénticas a la app)
const QUIZ = [
  { id: 'tueste', pregunta: '¿Qué tueste prefieres?', emoji: '🔥',
    opciones: [
      { label: 'Claro',  desc: 'Más ácido y floral', value: 'claro',  icon: '☀️' },
      { label: 'Medio',  desc: 'Equilibrado',         value: 'medio',  icon: '⚖️' },
      { label: 'Oscuro', desc: 'Amargo y denso',      value: 'oscuro', icon: '🌑' },
    ],
  },
  { id: 'origen', pregunta: '¿De qué origen te gustan más?', emoji: '🌍',
    opciones: [
      { label: 'África',      desc: 'Etiopía, Kenia, Ruanda',       value: 'africa',     icon: '🌺' },
      { label: 'América',     desc: 'Colombia, Costa Rica, Panamá', value: 'america',    icon: '🫘' },
      { label: 'Asia',        desc: 'Indonesia, Yemen, India',      value: 'asia',       icon: '🏔️' },
      { label: 'Sorpréndeme', desc: 'Cualquier origen',             value: 'cualquiera', icon: '✨' },
    ],
  },
  { id: 'acidez', pregunta: '¿Cómo te gusta la acidez?', emoji: '⚡',
    opciones: [
      { label: 'Alta',  desc: 'Viva y brillante', value: 'alta',  icon: '⚡' },
      { label: 'Media', desc: 'Equilibrada',       value: 'media', icon: '〰️' },
      { label: 'Baja',  desc: 'Suave y redonda',  value: 'baja',  icon: '🌊' },
    ],
  },
  { id: 'sabor', pregunta: '¿Qué sabores te atraen?', emoji: '👅',
    opciones: [
      { label: 'Floral',    desc: 'Jazmín, rosa, bergamota',    value: 'floral',    icon: '🌸' },
      { label: 'Frutal',    desc: 'Cereza, arándano, naranja',  value: 'frutal',    icon: '🍒' },
      { label: 'Chocolate', desc: 'Cacao, caramelo, nuez',      value: 'chocolate', icon: '🍫' },
      { label: 'Especias',  desc: 'Canela, cardamomo, vainilla', value: 'especias', icon: '🌶️' },
    ],
  },
];

function renderQuiz() {
  const root = document.getElementById('webQuizRoot');
  if (!root) return;
  let step = 0;
  let prefs = {};

  function showStep() {
    root.innerHTML = '';
    if (step === 0) {
      const intro = document.createElement('div');
      intro.className = 'quiz-intro';
      intro.innerHTML = `
        <div class="quiz-emoji">☕</div>
        <h2 class="quiz-title">¿Qué café es para ti?</h2>
        <div class="quiz-sub">4 preguntas y te recomendamos tu café ideal.</div>
        <button class="quiz-btn" id="startQuizBtn">Empezar →</button>
      `;
      root.appendChild(intro);
      document.getElementById('startQuizBtn').onclick = () => { step = 1; showStep(); };
      return;
    }
    if (step >= 1 && step <= QUIZ.length) {
      const pq = QUIZ[step - 1];
      const box = document.createElement('div');
      box.className = 'quiz-box';
      box.innerHTML = `
        <div class="quiz-progress">${QUIZ.map((_, i) => `<span class="quiz-dot${i < step ? ' active' : ''}"></span>`).join('')}</div>
        <div class="quiz-emoji">${pq.emoji}</div>
        <div class="quiz-pregunta">${pq.pregunta}</div>
        <div class="quiz-opciones"></div>
        ${step > 1 ? '<button class="quiz-btn-back" id="quizBackBtn">← Anterior</button>' : ''}
      `;
      root.appendChild(box);
      const opcionesDiv = box.querySelector('.quiz-opciones');
      pq.opciones.forEach(op => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opcion';
        btn.innerHTML = `<span class="quiz-opcion-icon">${op.icon}</span><span class="quiz-opcion-label">${op.label}</span><span class="quiz-opcion-desc">${op.desc}</span>`;
        btn.onclick = () => {
          prefs[pq.id] = op.value;
          if (step < QUIZ.length) { step++; showStep(); }
          else { step = QUIZ.length + 1; showStep(); }
        };
        opcionesDiv.appendChild(btn);
      });
      if (step > 1) document.getElementById('quizBackBtn').onclick = () => { step--; showStep(); };
      return;
    }
    // Paso final: resultado bloqueado
    const fin = document.createElement('div');
    fin.className = 'quiz-final';
    fin.innerHTML = `
      <div class="quiz-emoji">🎉</div>
      <h2 class="quiz-title">¡Listo!</h2>
      <div class="quiz-sub">Para ver tus resultados y cafés recomendados,<br><b>descarga la app Etiove</b>:</div>
      <div class="quiz-app-links">
        <a href="https://etiove.com/app" class="quiz-app-btn">Descargar App</a>
      </div>
      <div class="quiz-note">Tu progreso se guarda en este navegador.</div>
    `;
    root.appendChild(fin);
  }
  showStep();
}

document.addEventListener('DOMContentLoaded', renderQuiz);

// Estilos mínimos sugeridos para el quiz (añadir en CSS global o en línea)
/*
#webQuizRoot { max-width:400px;margin:32px auto;padding:24px;background:#fff;border-radius:18px;box-shadow:0 4px 24px #0001; }
.quiz-emoji { font-size:38px;text-align:center;margin-bottom:10px; }
.quiz-title { font-size:22px;font-weight:700;text-align:center;margin-bottom:8px; }
.quiz-sub { font-size:15px;color:#8b7355;text-align:center;margin-bottom:18px; }
.quiz-box { padding:10px 0; }
.quiz-opciones { display:grid;gap:12px;margin:18px 0; }
.quiz-opcion { background:#f6efe7;border:none;border-radius:12px;padding:14px 12px;text-align:left;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background .2s; }
.quiz-opcion:hover { background:#f0e8df; }
.quiz-opcion-icon { font-size:22px; }
.quiz-opcion-label { font-weight:600;font-size:16px; }
.quiz-opcion-desc { font-size:13px;color:#8b7355;margin-left:8px; }
.quiz-btn, .quiz-btn-back { background:#8f5e3b;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:16px;font-weight:600;cursor:pointer;margin:10px auto 0;display:block; }
.quiz-btn-back { background:#e4d3c2;color:#8f5e3b;margin-top:0; }
.quiz-progress { display:flex;gap:6px;justify-content:center;margin-bottom:12px; }
.quiz-dot { width:10px;height:10px;border-radius:50%;background:#e4d3c2;display:inline-block; }
.quiz-dot.active { background:#8f5e3b; }
.quiz-final { text-align:center;padding:24px 0; }
.quiz-app-links { margin:18px 0; }
.quiz-app-btn { background:#8f5e3b;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:17px; }
.quiz-note { font-size:12px;color:#9a7963;margin-top:18px; }
*/
