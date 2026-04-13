const guiaDeMoliendaPorMetodo = {
  slug: 'guia-de-molienda-por-metodo',
  title: 'Guía de Molienda por Método',
  description: 'Aprende el punto de molienda ideal para V60, Chemex, AeroPress, French Press y espresso sin perder dulzor ni claridad.',
  ogDescription: 'La molienda correcta para cada método: V60, Chemex, AeroPress, French Press y espresso, con ajustes rápidos cuando algo falla.',
  twitterDescription: 'Qué tan fino o grueso moler para cada método y cómo corregir tu extracción en segundos.',
  canonicalUrl: 'https://etiove.com/blog/guia-de-molienda-por-metodo.html',
  prevUrl: 'https://etiove.com/blog/como-elegir-el-mejor-cafe-de-etiopia.html',
  nextUrl: 'https://etiove.com/blog/cafe-de-especialidad-crece-en-espana-2026.html',
  ogImageAlt: 'Guía de molienda por método para café de especialidad',
  hero: {
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80&auto=format&fit=crop',
    imageSocial: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=85&auto=format&fit=crop',
    imageAlt: 'Molinillo manual y granos de café de especialidad',
    tag: 'Tutorial · 04 abril 2026 · 6 min de lectura',
    title: 'Guía de Molienda por Método',
    meta: 'Por el equipo de Etiove · Foto: Unsplash'
  },
  inlineCss: String.raw`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --ink: #1c120d;
      --ink-soft: #5d4030;
      --ink-muted: #8b7355;
      --cream: #f6efe7;
      --cream-alt: #fffaf5;
      --accent: #8f5e3b;
      --accent-deep: #5d4030;
      --border: #e4d3c2;
      --border-soft: rgba(228,211,194,0.55);
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Source Serif 4', Georgia, serif;
      color: var(--ink);
      background: var(--cream);
      min-height: 100vh;
      font-size: 16px;
      line-height: 1.75;
    }

    /* NAV */
    .site-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 40px;
      background: rgba(246,239,231,0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-soft);
    }
    .nav-wordmark {
      font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500;
      letter-spacing: 4px; text-transform: uppercase; color: var(--ink); text-decoration: none;
    }
    .nav-links { display: flex; align-items: center; gap: 32px; }
    .nav-link {
      font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;
      color: var(--ink-muted); text-decoration: none; transition: color 0.2s;
    }
    .nav-link:hover, .nav-link--active { color: var(--accent); }
    .nav-cta {
      font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--cream-alt); background: var(--ink); text-decoration: none;
      padding: 10px 20px; border-radius: 3px; transition: background 0.3s;
    }
    .nav-cta:hover { background: var(--accent-deep); }

    /* HERO */
    .post-hero {
      position: relative; margin-top: 56px;
      height: min(500px, 55vw); min-height: 240px; overflow: hidden;
    }
    .hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(28,18,13,0.06) 0%, rgba(28,18,13,0.5) 55%, rgba(28,18,13,0.82) 100%);
    }
    .hero-content {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: clamp(16px,4vw,44px); max-width: 1120px;
    }
    .hero-tag {
      display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(255,236,210,0.85);
      background: rgba(143,94,59,0.65); border-radius: 999px; padding: 4px 10px; margin-bottom: 10px;
    }
    .hero-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(20px,3.5vw,44px); font-weight: 800; line-height: 1.12;
      max-width: min(1080px, 100%);
      text-wrap: balance;
      color: #fff9f1; margin-bottom: 7px;
    }
    .hero-meta { font-size: 12px; color: rgba(255,249,241,0.6); }

    /* PAGE */
    .page-body { max-width: 740px; margin: 0 auto; padding: 32px 20px 80px; }

    /* BREADCRUMB */
    .breadcrumb { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
    .breadcrumb a { font-size: 13px; color: var(--ink-muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--accent); }
    .breadcrumb-sep { font-size: 12px; color: var(--border); }
    .breadcrumb-current { font-size: 13px; color: var(--ink-soft); font-weight: 600; }

    /* TOC */
    .toc {
      background: var(--cream-alt); border: 1px solid var(--border); border-radius: 14px;
      padding: 14px 18px; margin-bottom: 26px;
    }
    .toc-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); font-weight: 700; margin-bottom: 10px; }
    .toc ol { padding-left: 18px; display: grid; gap: 4px; }
    .toc li { font-size: 14px; color: var(--ink-soft); }
    .toc a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .toc a:hover { text-decoration: underline; }

    /* ARTICLE */
    .lead {
      font-size: 18px; line-height: 1.7; color: var(--ink-soft); margin-bottom: 22px;
      border-left: 3px solid var(--border); padding-left: 14px;
    }
    .article h2 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(18px,2.6vw,24px); font-weight: 700;
      margin: 32px 0 9px; padding-bottom: 7px; border-bottom: 1px solid var(--border);
      color: var(--ink);
    }
    .article h3 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(15px,2vw,17px); font-weight: 700;
      margin: 9px 0 4px; color: var(--ink);
    }
    .article p { font-size: 16px; color: #38251c; line-height: 1.8; margin-bottom: 13px; }

    /* REGION CARDS */
    .region-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 9px; margin: 16px 0; }
    .region-card { border: 1px solid var(--border); border-radius: 14px; padding: 14px; background: var(--cream-alt); }
    .region-icon { font-size: 24px; margin-bottom: 6px; display: block; }
    .region-name { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
    .region-profile { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--accent); margin-bottom: 5px; }
    .region-card p { font-size: 12px; color: var(--ink-soft); line-height: 1.55; margin: 0; }

    /* FIGURE */
    figure { margin: 22px -4px; }
    figure img { width: 100%; border-radius: 14px; display: block; object-fit: cover; max-height: 380px; }
    figcaption { font-size: 12px; color: var(--ink-muted); margin-top: 6px; padding: 0 4px; font-style: italic; }

    /* PROCESS GRID */
    .process-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 16px 0; }
    .process-card { border: 1px solid var(--border); border-radius: 14px; padding: 15px; }
    .process-card.washed { background: rgba(210,230,255,0.28); }
    .process-card.natural { background: rgba(255,225,190,0.28); }
    .process-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 999px; padding: 3px 9px; margin-bottom: 8px; }
    .process-card.washed .process-badge { background: rgba(80,140,200,0.15); color: #2d6a8f; }
    .process-card.natural .process-badge { background: rgba(190,90,40,0.15); color: #8f4020; }
    .process-card h3 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 6px; margin-top: 0; }
    .process-card p { font-size: 13px; color: var(--ink-soft); margin: 0; line-height: 1.65; }
    .process-notes { margin-top: 9px; display: flex; flex-wrap: wrap; gap: 5px; }
    .note-pill { font-size: 11px; border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; color: var(--ink-muted); background: rgba(255,255,255,0.6); }

    /* PULL QUOTE */
    .pull-quote { margin: 26px 0; padding: 16px 20px; border-left: 4px solid var(--accent); background: rgba(143,94,59,0.07); border-radius: 0 12px 12px 0; }
    .pull-quote p { font-family: 'Playfair Display', serif; font-size: 17px; font-style: italic; color: var(--ink-soft); line-height: 1.55; margin: 0; }

    /* TIP */
    .tip {
      border: 1px solid rgba(143,94,59,0.3);
      background: rgba(143,94,59,0.07);
      border-radius: 12px;
      padding: 13px 16px; margin: 16px 0;
      color: var(--ink); font-size: 15px; line-height: 1.7;
    }
    .tip strong { color: var(--accent-deep); }

    /* YOUTUBE CARDS */
    .video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 16px 0; }
    .video-card { border: 1px solid var(--border); border-radius: 14px; overflow: hidden; text-decoration: none; display: block; background: var(--cream-alt); transition: transform 0.2s, box-shadow 0.2s; }
    .video-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(28,18,13,0.1); }
    .video-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; }
    .video-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
    .play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .play-circle { width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.28); }
    .play-circle svg { width: 17px; height: 17px; fill: var(--accent-deep); margin-left: 3px; }
    .video-info { padding: 10px 12px; }
    .video-channel { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 3px; }
    .video-title { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.4; }
    .yt-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 5px; font-size: 11px; color: #c00; font-weight: 700; }

    /* POST ACTIONS */
    .post-actions { margin-top: 36px; padding-top: 22px; border-top: 1px solid var(--border); }
    .section-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 11px; }
    .share-row { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 24px; }
    .share-btn {
      border: 1px solid var(--border); border-radius: 999px; padding: 8px 14px;
      background: var(--cream-alt); color: var(--ink-soft);
      text-decoration: none; font-weight: 700; font-size: 13px; cursor: pointer;
      font-family: inherit; transition: border-color 0.2s, color 0.2s;
      display: flex; align-items: center; gap: 7px;
    }
    .share-btn:hover { border-color: var(--accent); color: var(--accent); }
    .share-btn svg { width: 14px; height: 14px; fill: currentColor; }
    .comment-help { margin-bottom: 10px; color: var(--ink-soft); font-size: 14px; }
    .comment-help a { color: var(--accent); font-weight: 700; text-decoration: none; }
    .comment-box {
      width: 100%; border: 1px solid var(--border); border-radius: 12px;
      min-height: 88px; padding: 11px 13px; font-size: 15px; font-family: inherit;
      color: var(--ink); background: #fff; resize: vertical; margin-bottom: 10px;
    }
    .comment-send {
      border: none; border-radius: 999px; padding: 10px 20px;
      background: var(--accent-deep); color: #fff;
      font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .comment-send:disabled { opacity: 0.45; cursor: not-allowed; }
    .comment-status { margin-top: 10px; font-size: 13px; color: var(--ink-soft); }
    .comment-list { margin-top: 18px; display: grid; gap: 9px; }
    .comment-item { border: 1px solid var(--border); border-radius: 12px; background: rgba(255,250,245,0.75); padding: 13px; }
    .comment-meta { font-size: 12px; color: #7b6049; margin-bottom: 5px; }
    .comment-body { margin: 0; font-size: 15px; color: #38251c; line-height: 1.65; white-space: pre-wrap; }

    .scroll-top {
      position: fixed;
      bottom: 24px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent-deep);
      color: #fff9f1;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 18px rgba(28, 18, 13, 0.22);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      z-index: 200;
    }
    .scroll-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .scroll-top:hover { background: var(--accent); }

    
    /* ─── HAMBURGER NAV MÓVIL ─── */
    .nav-hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
    }
    .nav-hamburger span { display: block; width: 22px; height: 2px; background: var(--ink); border-radius: 2px; transition: transform 0.25s, opacity 0.25s; }
    .nav-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .nav-hamburger.open span:nth-child(2) { opacity: 0; }
    .nav-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
@media (max-width: 768px) {
      .site-nav { padding: 16px 20px; }
      .nav-hamburger { display: flex; }
      .nav-links { display: none !important; flex-direction: column !important; position: fixed !important; inset: 0 !important; background: rgba(246,239,231,0.98) !important; backdrop-filter: blur(16px) !important; z-index: 150 !important; align-items: center !important; justify-content: center !important; gap: 32px !important; padding: 40px 24px !important; }
      .nav-links.open { display: flex !important; }
      .nav-link { font-size: 16px !important; letter-spacing: 3px !important; }
      .nav-cta { display: none; }
      .post-hero { height: min(220px, 56vw); }
      .hero-title { font-size: 20px; }
      .region-grid { grid-template-columns: 1fr; gap: 7px; }
      .process-grid { grid-template-columns: 1fr; }
      .video-grid { grid-template-columns: 1fr; }
      figure { margin: 14px 0; }
    }
  
    
    .nav-wordmark {
      font-family: 'Playfair Display', serif;
      font-size: 22px; font-weight: 500;
      letter-spacing: 4px; color: var(--ink);
      text-decoration: none; text-transform: uppercase;
    }
    .nav-links {
      display: flex; align-items: center; gap: 32px;
    }
    .nav-link {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px; font-weight: 500;
      letter-spacing: 2px; text-transform: uppercase;
      color: var(--ink-muted); text-decoration: none;
      transition: color 0.3s;
    }
    .nav-link:hover { color: var(--accent); }
    @media (max-width: 768px) {
      nav { padding: 16px 20px; }
      .nav-links { display: none; }
    }

        /* ── NAV ── */
    .site-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 40px;
      background: rgba(246, 239, 231, 0.92);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(228, 211, 194, 0.55);
    }
    .nav-wordmark {
      font-family: 'Playfair Display', serif;
      font-size: 22px; font-weight: 500;
      letter-spacing: 4px; text-transform: uppercase;
      color: #1c120d; text-decoration: none;
    }
    .nav-links { display: flex; align-items: center; gap: 32px; }
    .nav-link {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px; font-weight: 500; letter-spacing: 2px;
      text-transform: uppercase; color: #9a7963;
      text-decoration: none; transition: color 0.2s;
    }
    .nav-link:hover, .nav-link--active { color: #8f5e3b; }
    @media (max-width: 768px) {
      .site-nav { padding: 14px 20px; }
      .nav-links { display: none; }
    }
        .cta-box {
      background: linear-gradient(145deg, #1f130d, #2d1a10);
      border-radius: 20px; padding: 36px 32px; text-align: center;
      margin: 48px 0 0; position: relative; overflow: hidden;
    }
    .cta-box::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 70% 60% at 80% -10%, rgba(201,149,87,0.2) 0%, transparent 60%);
      pointer-events: none;
    }
    .cta-box::after {
      content: ''; position: absolute; top: 0; left: 40px; right: 40px; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,228,190,0.25), transparent);
      pointer-events: none;
    }
    .cta-eyebrow { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 3.5px; text-transform: uppercase; color: rgba(205,165,120,0.7); margin-bottom: 14px; position: relative; z-index: 1; }
    .cta-title { font-family: 'Playfair Display', serif; font-size: clamp(22px, 4vw, 32px); font-weight: 400; color: #fff4ea; line-height: 1.15; margin-bottom: 14px; position: relative; z-index: 1; }
    .cta-title em { font-style: italic; color: rgba(228,195,164,0.9); }
    .cta-sub { font-size: 15px; color: rgba(255,249,241,0.5); line-height: 1.7; max-width: 420px; margin: 0 auto 28px; position: relative; z-index: 1; }
    .cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
    .cta-btn-primary { display: inline-flex; align-items: center; gap: 10px; background: #e8d5be; color: #1a0f08; border: none; border-radius: 2px; padding: 14px 32px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; transition: background 0.3s, transform 0.2s; }
    .cta-btn-primary:hover { background: #f5e6cf; transform: translateY(-2px); }
    .cta-btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: rgba(255,249,241,0.5); border: 1px solid rgba(228,195,164,0.2); border-radius: 2px; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; transition: all 0.3s; }
    .cta-btn-ghost:hover { border-color: rgba(228,195,164,0.45); color: rgba(255,249,241,0.8); }
        .post-nav { display: flex; gap: 16px; margin-top: 48px; flex-wrap: wrap; }
    .post-nav-link {
      flex: 1; min-width: 200px; padding: 18px 20px;
      background: var(--cream-alt); border: 1px solid var(--border);
      border-radius: 14px; text-decoration: none; transition: all 0.2s;
    }
    .post-nav-link:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(28,18,13,0.08); border-color: var(--accent); }
    .post-nav-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 6px; }
    .post-nav-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 500; color: var(--ink); line-height: 1.35; }
    
    /* ─── ARTÍCULOS RELACIONADOS ─── */
    .related-section { margin-top: 56px; padding-top: 40px; border-top: 1px solid var(--border); }
    .related-label { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 20px; }
    .related-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .related-card { display: flex; flex-direction: column; text-decoration: none; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: all .2s; }
    .related-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(28,18,13,.08); border-color: var(--accent); }
    .related-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .related-body { padding: 14px 16px; flex: 1; }
    .related-tag { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; display: block; }
    .related-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 500; color: var(--ink); line-height: 1.35; }
    @media (max-width: 600px) { .related-grid { grid-template-columns: 1fr; } }

    
    /* ─── FOOTER (canonical) ─── */
    footer {
      position: relative; z-index: 1;
      padding: 32px 40px 32px;
      border-top: 1px solid var(--border-soft);
      display: grid; grid-template-columns: 1fr;
      gap: 0; align-items: start;
      background: #f6efe7;
    }
    .footer-nav { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; gap: 20px; }
    .footer-nav-group { display: flex; flex-wrap: wrap; gap: 8px 28px; }
    .footer-nav-label { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); opacity: 0.6; width: 100%; margin-bottom: 2px; }
    .footer-nav-link { font-size: 13px; font-weight: 400; color: var(--ink-soft); text-decoration: none; transition: color 0.2s; letter-spacing: 0.2px; }
    .footer-nav-link:hover { color: var(--accent); }
    .footer-legal-link { font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); text-decoration: none; opacity: 0.7; transition: opacity 0.2s, color 0.2s; }
    .footer-legal-link:hover { opacity: 1; color: var(--accent); }
    .footer-copy {
      font-size: 11px; color: var(--ink-muted); letter-spacing: 0.5px; font-weight: 300;
      grid-column: 1 / -1; grid-row: 2; margin-top: 40px;
      padding-top: 24px; padding-bottom: 16px;
      border-top: 1px solid var(--border-soft);
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
    }
    .footer-copy-center { display: flex; align-items: center; gap: 14px; }
    .footer-wordmark-sm {
      font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 400;
      letter-spacing: 6px; text-transform: uppercase; color: var(--ink-soft);
    }
    .social-row-inline { display: flex; align-items: center; gap: 12px; }
    .social-row-inline .social-link { width: 38px; height: 38px; }
    .social-row-inline .social-link svg { width: 17px; height: 17px; }
    .social-link {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border: 1px solid var(--border);
      border-radius: 50%; text-decoration: none; transition: all 0.3s; color: var(--ink-muted);
    }
    .social-link:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }
    .social-link svg { width: 16px; height: 16px; fill: currentColor; }
    @media (max-width: 768px) {
      footer { padding: 28px 20px; }
      .footer-copy { flex-direction: column; align-items: flex-start; }
    }`,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Guía de Molienda por Método: de V60 a Espresso',
    description: 'Aprende el punto de molienda ideal para V60, Chemex, AeroPress, French Press y espresso sin perder dulzor ni claridad.',
    datePublished: '2026-04-02',
    dateModified: '2026-04-02',
    author: {
      '@type': 'Organization',
      name: 'Etiove'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Etiove',
      url: 'https://etiove.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://etiove.com/favicon.svg',
        width: 512,
        height: 512
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://etiove.com/blog/guia-de-molienda-por-metodo.html'
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80&auto=format&fit=crop',
      width: 1400,
      height: 700,
      caption: 'Molinillo manual y granos de café de especialidad'
    },
    wordCount: 524,
    timeRequired: 'PT7M'
  },
  breadcrumbJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://etiove.com/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://etiove.com/blog/'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Guía de Molienda por Método: de V60 a Espresso',
        item: 'https://etiove.com/blog/guia-de-molienda-por-metodo.html'
      }
    ]
  },
  bodyHtml: String.raw`<article class="article">

      <p class="lead">La molienda es el mando más potente para mejorar una taza en casa. Antes de cambiar el café, el agua o la cafetera, afina el tamaño de partícula y verás cómo suben dulzor, claridad y balance.</p>

      <!-- SECCIÓN 1: BASE -->
      <h2 id="base">1. La Regla Base de la Molienda</h2>
      <p>Si el agua pasa muy rápido, extrae poco y el café sabe ácido o hueco: necesitas moler más fino. Si el agua pasa demasiado lento, extrae de más y aparece amargor o astringencia: necesitas moler más grueso.</p>

      <div class="region-grid">
        <div class="region-card">
          <span class="region-icon">⚖️</span>
          <div class="region-name">Balance</div>
          <div class="region-profile">Dulzor · Claridad · Cuerpo</div>
          <p>El objetivo no es extraer más, sino extraer mejor. Una molienda correcta reparte sabor sin extremos.</p>
        </div>
        <div class="region-card">
          <span class="region-icon">⏱️</span>
          <div class="region-name">Tiempo</div>
          <div class="region-profile">Contacto · Flujo · Extracción</div>
          <p>A más fino, más resistencia y más tiempo de contacto. A más grueso, menos resistencia y extracción más corta.</p>
        </div>
        <div class="region-card">
          <span class="region-icon">🔁</span>
          <div class="region-name">Iteración</div>
          <div class="region-profile">1 ajuste · 1 prueba · 1 nota</div>
          <p>No cambies tres cosas a la vez. Ajusta un clic por preparación y anota el resultado.</p>
        </div>
      </div>

      <figure>
        <img
          src="https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=1200&q=80&auto=format&fit=crop"
          alt="Molinillo manual con café en grano"
          loading="lazy" width="740" height="380"
        />
        <figcaption>La consistencia del molido importa más que la marca del método · Foto: Unsplash</figcaption>
      </figure>

      <!-- SECCIÓN 2: MÉTODOS -->
      <h2 id="metodos">2. Ajuste Según Método</h2>
      <p>Usa esta guía como punto de partida y corrige en micro-ajustes hasta encontrar tu taza ideal:</p>

      <div class="process-grid">
        <div class="process-card washed">
          <span class="process-badge">Filtro · V60 / Chemex</span>
          <h3>💧 Medio a medio-fino</h3>
          <p>Busca un flujo estable y limpio. Si queda ácido y rápido, afina. Si queda plano y lento, abre un punto.</p>
          <div class="process-notes">
            <span class="note-pill">Tiempo: 2:30-3:30</span>
            <span class="note-pill">Ratio 1:15-1:17</span>
            <span class="note-pill">Agua 92-96°C</span>
            <span class="note-pill">Claridad alta</span>
          </div>
        </div>
        <div class="process-card natural">
          <span class="process-badge">Inmersión · French / AeroPress</span>
          <h3>🍑 Medio a medio-grueso</h3>
          <p>Prioriza cuerpo y dulzor sin barro. Si sale áspero, abre molienda; si queda aguado, ciérrala un poco.</p>
          <div class="process-notes">
            <span class="note-pill">Prensa: 4:00</span>
            <span class="note-pill">AeroPress: 1:30-2:00</span>
            <span class="note-pill">Filtra fino al final</span>
            <span class="note-pill">Cuerpo medio</span>
          </div>
        </div>
      </div>

      <figure>
        <img
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80&auto=format&fit=crop"
          alt="Espresso servido en taza pequeña"
          loading="lazy" width="740" height="380"
        />
        <figcaption>En espresso, pequeños cambios de molienda tienen un impacto enorme en segundos de extracción · Foto: Unsplash</figcaption>
      </figure>

      <!-- SECCIÓN 3: ERRORES -->
      <h2 id="errores">3. Errores Comunes y Solución Rápida</h2>
      <p>Cuando algo falla en taza, no empieces cambiando todo. Esta mini-matriz te ahorra muchas bolsas de café:</p>

      <div class="pull-quote">
        <p>"Ácido y corto = más fino. Amargo y seco = más grueso. Si estás cerca, ajusta solo un clic por preparación."</p>
      </div>

      <p>Espresso recomendado: molienda fina y uniforme, buscando 1:2 en 25-32 segundos. Si el shot cae en 18-20 segundos, está demasiado grueso. Si supera 35-40 segundos, está demasiado fino.</p>

      <div class="tip">
        <strong>Tip de Etiove:</strong> Congela dosis individuales en recipientes herméticos y muele justo antes de preparar. Mejor frescura y ajustes más estables día tras día.
      </div>

      <!-- SECCIÓN 4: VÍDEOS -->
      <h2 id="video">4. Aprende Más en Vídeo</h2>
      <p>Estos vídeos te sirven para visualizar el punto de molienda correcto en cada método:</p>

      <div class="video-grid">
        <a
          class="video-card"
          href="https://www.youtube.com/results?search_query=guia+molienda+v60+chemex"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="video-thumb video-thumb--warm">
            <img
              src="https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=480&q=70&auto=format&fit=crop"
              alt="Preparación de café filtrado" loading="lazy"
             width="480" height="320" />
            <div class="play-btn">
              <div class="play-circle">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-channel">YouTube · Filtro</div>
            <div class="video-title">Molienda para V60 y Chemex sin sobreextraer</div>
            <div class="yt-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c00"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8z"/><path fill="#fff" d="M9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>
              Ver en YouTube
            </div>
          </div>
        </a>

        <a
          class="video-card"
          href="https://www.youtube.com/results?search_query=molienda+espresso+ajuste+shot"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="video-thumb video-thumb--green">
            <img
              src="https://images.unsplash.com/photo-1508767986891-c2bc4b9e2059?w=480&q=70&auto=format&fit=crop"
              alt="Molinillo y espresso" loading="lazy"
             width="480" height="320" />
            <div class="play-btn">
              <div class="play-circle">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-channel">YouTube · Espresso</div>
            <div class="video-title">Cómo ajustar la molienda de espresso en casa</div>
            <div class="yt-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c00"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8z"/><path fill="#fff" d="M9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>
              Ver en YouTube
            </div>
          </div>
        </a>
      </div>

      <!-- SHARE + COMMENTS -->
      <section class="post-actions" id="comentarios">
        <p class="section-label">Comparte este artículo</p>
        <div class="share-row">
          <a id="shareX" class="share-btn" target="_blank" rel="noopener noreferrer" href="#">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Compartir en X
          </a>
          <button id="shareInstagram" class="share-btn" type="button">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </button>
          <button id="copyLink" class="share-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Copiar enlace
          </button>
        </div>

        <p class="section-label">Respuestas</p>
        <p id="commentHelp" class="comment-help"></p>
        <textarea id="commentBody" class="comment-box" maxlength="1000" placeholder="¿Qué método usas y en qué punto de molienda te funciona mejor?"></textarea>
        <button id="sendComment" class="comment-send" type="button">Publicar respuesta</button>
        <div id="commentStatus" class="comment-status"></div>
        <div id="commentList" class="comment-list"></div>
      </section>

    </article>

    <div class="cta-box">
      <p class="cta-eyebrow">Comunidad Etiove</p>
      <h2 class="cta-title">¿Tienes dudas sobre<br><em>tu molienda concreta?</em></h2>
      <p class="cta-sub">En la comunidad Etiove hay catadores que resuelven exactamente este tipo de preguntas. Describe tu método y te ayudamos.</p>
      <div class="cta-btns">
        <a class="cta-btn-primary" href="/comunidad.html">
          Ir a la comunidad
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a class="cta-btn-ghost" href="/blog/">← Más artículos</a>
      </div>
    </div>
    <section class="related-section">
      <p class="related-label">También te puede interesar</p>
      <div class="related-grid">
      <a class="related-card" href="/blog/como-elegir-el-mejor-cafe-de-etiopia.html">
        <img class="related-thumb" src="https://images.unsplash.com/photo-1461988091159-192b6df7054f?w=400&q=75&auto=format&fit=crop" alt="Cómo Elegir el Mejor Café de Etiopía: Guía Completa" loading="lazy" width="400" height="225" />
        <div class="related-body">
          <span class="related-tag">Guía</span>
          <p class="related-title">Cómo Elegir el Mejor Café de Etiopía: Guía Completa</p>
        </div>
      </a>      <a class="related-card" href="/blog/por-que-mi-cafe-sabe-amargo.html">
        <img class="related-thumb" src="https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=75&auto=format&fit=crop" alt="¿Por qué mi café sabe amargo? 7 causas y sus soluciones" loading="lazy" width="400" height="225" />
        <div class="related-body">
          <span class="related-tag">Guía</span>
          <p class="related-title">¿Por qué mi café sabe amargo? 7 causas y sus soluciones</p>
        </div>
      </a>
      </div>
    </section>

        <nav class="post-nav" aria-label="Otros artículos">
      <a class="post-nav-link" href="/blog/como-elegir-el-mejor-cafe-de-etiopia.html">
        <p class="post-nav-label">← Anterior</p>
        <p class="post-nav-title">Cómo Elegir el Mejor Café de Etiopía: Guía Completa</p>
      </a>
      <a class="post-nav-link" href="/blog/cafe-de-especialidad-crece-en-espana-2026.html">
        <p class="post-nav-label">Siguiente →</p>
        <p class="post-nav-title">El Café de Especialidad Crece un 34% en España</p>
      </a>
    </nav>`
};

module.exports = {
  guiaDeMoliendaPorMetodo,
};
