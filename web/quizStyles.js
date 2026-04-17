export const QUIZ_STYLE_ELEMENT_ID = 'eq-styles';

export const QUIZ_STYLES = `
  #webQuizRoot * { box-sizing: border-box; }
  #webQuizRoot h1, #webQuizRoot h2, #webQuizRoot h3, #webQuizRoot h4,
  #webQuizRoot h5, #webQuizRoot h6, #webQuizRoot p, #webQuizRoot ul,
  #webQuizRoot ol, #webQuizRoot figure { margin: 0; padding: 0; }

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
    margin-bottom: 32px;
    position: relative;
    z-index: 2;
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

  .eq-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    background: #21150f;
    color: #fdf8f1;
    border: 1px solid rgba(255,255,255,0.12);
    padding: 20px 48px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.25s, transform 0.2s, box-shadow 0.25s, border-color 0.25s;
    font-family: inherit;
    text-decoration: none;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
  }
  .eq-btn-primary:hover {
    background: #2d1a0e;
    border-color: rgba(201,149,87,0.5);
    transform: translateY(-3px);
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
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
    margin-bottom: 44px;
  }

  .eq-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 40px;
  }
  .eq-options.cols-3 { grid-template-columns: repeat(3, 1fr); }

  .eq-option {
    background: rgba(255,249,241,0.04);
    border: 1px solid rgba(228,195,164,0.20);
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    padding: 28px 24px 24px;
    transition: border-color 0.2s, background 0.2s, transform 0.18s, box-shadow 0.2s;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }
  .eq-option::before {
    content: '';
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 3px;
    background: linear-gradient(to bottom, #c99557, #efd5ad);
    border-radius: 12px 0 0 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .eq-option::after {
    content: '✓';
    position: absolute;
    top: 14px; right: 16px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #c99557;
    color: #1a0f08;
    font-size: 12px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 22px;
    text-align: center;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.2s, transform 0.2s;
    font-family: -apple-system, sans-serif;
  }
  .eq-option:hover {
    border-color: rgba(201,149,87,0.55);
    background: rgba(201,149,87,0.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.25);
  }
  .eq-option:hover::before { opacity: 0.6; }
  .eq-option.selected {
    border-color: #c99557;
    background: rgba(201,149,87,0.14);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(201,149,87,0.2);
    pointer-events: none;
  }
  .eq-option.selected::before { opacity: 1; }
  .eq-option.selected::after { opacity: 1; transform: scale(1); }
  .eq-option.selected .eq-option-label { color: #efd5ad; }
  .eq-option.selected .eq-option-num { color: rgba(201,149,87,0.8); }

  .eq-option-num {
    font-family: -apple-system, sans-serif;
    font-size: 9px;
    color: rgba(205,165,120,0.35);
    letter-spacing: 2.5px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .eq-option-label {
    font-family: 'Playfair Display', serif;
    font-size: clamp(16px, 2.2vw, 20px);
    font-weight: 500;
    color: rgba(255,249,241,0.90);
    letter-spacing: 0.2px;
    line-height: 1.2;
    transition: color 0.2s;
    margin-bottom: 8px;
  }
  .eq-option-desc {
    font-size: 12px;
    color: rgba(255,249,241,0.45);
    font-weight: 300;
    letter-spacing: 0.4px;
    line-height: 1.7;
  }

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
    align-items: stretch;
    gap: 12px;
    margin-top: 32px;
    position: relative;
    z-index: 2;
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

  .eq-result-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(201,149,87,0.25), rgba(201,149,87,0.10));
    border: 1px solid rgba(201,149,87,0.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    margin: 0 auto 24px;
    position: relative; z-index: 2;
  }

  .eq-summary-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 28px;
    position: relative;
    z-index: 2;
  }
  .eq-summary-pill {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 14px 16px;
    background: rgba(255,249,241,0.06);
    border: 1px solid rgba(228,195,164,0.18);
    border-radius: 12px;
    position: relative;
  }
  .eq-summary-pill::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #c99557, transparent);
    border-radius: 12px 12px 0 0;
    opacity: 0.6;
  }
  .eq-summary-key {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: rgba(201,149,87,0.65);
    display: block;
    font-family: -apple-system, sans-serif;
  }
  .eq-summary-val {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 500;
    color: #f4dfc8;
    letter-spacing: 0.3px;
  }

  @media (max-width: 600px) {
    #webQuizRoot { padding: 80px 20px 100px; min-height: auto; }
    .eq-options, .eq-options.cols-3 { grid-template-columns: 1fr; gap: 12px; }
    .eq-option { padding: 22px 20px 20px; }
    .eq-btn-primary { padding: 18px 36px; width: 100%; justify-content: center; }
  }
`;

export function ensureQuizStyles() {
  if (document.getElementById(QUIZ_STYLE_ELEMENT_ID)) return;

  const style = document.createElement('style');
  style.id = QUIZ_STYLE_ELEMENT_ID;
  style.textContent = QUIZ_STYLES;
  document.head.appendChild(style);
}
