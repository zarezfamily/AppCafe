const comoElegirElMejorCafeDeEtiopia = {
  slug: 'como-elegir-el-mejor-cafe-de-etiopia',
  title: 'Cómo Elegir el Mejor Café de Etiopía',
  description: 'Guía completa de Etiove para elegir café de Etiopía según región, proceso y altitud.',
  ogDescription: 'Guía completa para elegir café etíope: regiones clave, proceso lavado vs natural y por qué su origen es único.',
  twitterDescription: 'Guía completa para elegir café etíope por región, proceso y altitud.',
  canonicalUrl: 'https://etiove.com/blog/como-elegir-el-mejor-cafe-de-etiopia.html',
  prevUrl: '',
  nextUrl: 'https://etiove.com/blog/guia-de-molienda-por-metodo.html',
  hero: {
    image: 'https://images.unsplash.com/photo-1461988091159-192b6df7054f?w=1400&q=80&auto=format&fit=crop',
    imageSocial: 'https://images.unsplash.com/photo-1461988091159-192b6df7054f?w=1200&q=85&auto=format&fit=crop',
    imageAlt: 'Cafetales en las tierras altas de Etiopía',
    tag: 'Guía · 03 abril 2026 · 5 min de lectura',
    title: 'Cómo Elegir el Mejor Café de Etiopía',
    meta: 'Por el equipo de Etiove · Foto: Unsplash'
  },
  inlineCss: String.raw`    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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
    .scroll-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .scroll-top:hover { background: var(--accent); }
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
    .post-nav-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 500; color: var(--ink); line-height: 1.35; }`,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Cómo Elegir el Mejor Café de Etiopía: Guía Completa',
    description: 'Guía completa de Etiove para elegir café de Etiopía según región, proceso y altitud.',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
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
      '@id': 'https://etiove.com/blog/como-elegir-el-mejor-cafe-de-etiopia.html'
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://images.unsplash.com/photo-1461988091159-192b6df7054f?w=1400&q=80&auto=format&fit=crop',
      width: 1400,
      height: 700,
      caption: 'Cafetales en las tierras altas de Etiopía'
    },
    wordCount: 525,
    timeRequired: 'PT6M'
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
        name: 'Cómo Elegir el Mejor Café de Etiopía: Guía Completa',
        item: 'https://etiove.com/blog/como-elegir-el-mejor-cafe-de-etiopia.html'
      }
    ]
  },
  bodyHtml: String.raw`
    

    

    <article class="article">

      <p class="lead">¿Alguna vez has probado un café que sabía a jazmín y melocotón en lugar de a "quemado"? Si la respuesta es sí, probablemente era etíope. Entender el origen es el primer paso para una taza perfecta.</p>

      <!-- SECCIÓN 1: REGIONES -->
      <h2 id="regiones">1. Las Tres Regiones Clave</h2>
      <p>Etiopía es la cuna del café. Cada región tiene un terroir y un perfil sensorial completamente diferente — no es lo mismo comprar "café etíope" que elegir de qué valle viene.</p>

      <div class="region-grid">
        <div class="region-card">
          <span class="region-icon">🌸</span>
          <div class="region-name">Yirgacheffe</div>
          <div class="region-profile">Floral · Cítrico · Delicado</div>
          <p>El "champán" del café. Notas de jazmín, bergamota y limón. Cuerpo ligero. Ideal para V60 y Chemex.</p>
        </div>
        <div class="region-card">
          <span class="region-icon">🍒</span>
          <div class="region-name">Sidamo</div>
          <div class="region-profile">Frutos rojos · Equilibrado</div>
          <p>Acidez suave, frutos rojos y dulzura constante. El favorito de quienes buscan complejidad sin estridencias.</p>
        </div>
        <div class="region-card">
          <span class="region-icon">🍓</span>
          <div class="region-name">Guji</div>
          <div class="region-profile">Fresa · Vainilla · Especiado</div>
          <p>La joya moderna. Extremadamente dulce. Si nunca has probado un Guji natural, estás perdiéndote algo singular.</p>
        </div>
      </div>

      <figure>
        <img
          src="https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=1200&q=80&auto=format&fit=crop"
          alt="Granos de café verde etíope antes del tueste"
          loading="lazy" width="740" height="380"
        />
        <figcaption>Granos crudos de café etíope — variedad Heirloom ancestral · Foto: Unsplash</figcaption>
      </figure>

      <!-- SECCIÓN 2: PROCESO -->
      <h2 id="proceso">2. Proceso Lavado vs. Natural</h2>
      <p>El mismo grano puede saber completamente diferente según cómo se procesa tras la cosecha:</p>

      <div class="process-grid">
        <div class="process-card washed">
          <span class="process-badge">Washed · Lavado</span>
          <h3>💧 Claridad floral</h3>
          <p>El grano se limpia con agua antes del secado. Pureza máxima, acidez brillante y notas florales sin interferencias.</p>
          <div class="process-notes">
            <span class="note-pill">Jazmín</span>
            <span class="note-pill">Bergamota</span>
            <span class="note-pill">Limón</span>
            <span class="note-pill">Té verde</span>
          </div>
        </div>
        <div class="process-card natural">
          <span class="process-badge">Natural · Seco</span>
          <h3>🍑 Explosión de fruta</h3>
          <p>El grano se seca dentro de la cereza entera, absorbiendo todos los azúcares. Fruta madura y mermelada.</p>
          <div class="process-notes">
            <span class="note-pill">Arándanos</span>
            <span class="note-pill">Fresa</span>
            <span class="note-pill">Vino</span>
            <span class="note-pill">Mango</span>
          </div>
        </div>
      </div>

      <figure>
        <img
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80&auto=format&fit=crop"
          alt="Taza de café de especialidad preparada con método de filtro"
          loading="lazy" width="740" height="380"
        />
        <figcaption>Café etíope lavado de Yirgacheffe en V60 — la transparencia en taza es su marca de identidad · Foto: Unsplash</figcaption>
      </figure>

      <!-- SECCIÓN 3: POR QUÉ ES ÚNICO -->
      <h2 id="porque">3. Por Qué el Café Etíope es Diferente</h2>
      <p>No es marketing. A diferencia del 90% del café mundial —que proviene de unas pocas variedades comerciales— en Etiopía el café crece de forma silvestre desde hace miles de años.</p>

      <div class="pull-quote">
        <p>"En Etiopía existen más de 10.000 variedades genéticas de café identificadas. En el resto del mundo, apenas unas decenas dominan toda la producción comercial."</p>
      </div>

      <p>La mayoría de los lotes se etiquetan como <strong>Heirloom</strong> —variedades ancestrales sin nombre específico— o bajo IGPs certificados como Yirgacheffe, Sidamo y Harrar. Esta biodiversidad es irrepetible fuera de sus fronteras.</p>

      <div class="tip">
        <strong>Tip de Etiove:</strong> Fíjate siempre en la altitud. Por encima de <strong>1.800 msnm</strong> el grano desarrolla una densidad y complejidad aromática que no existe en cotas más bajas — el equivalente al grand cru en el vino.
      </div>

      <!-- SECCIÓN 4: VÍDEOS -->
      <h2 id="video">4. Aprende Más en Vídeo</h2>
      <p>Estos recursos en YouTube te ayudan a entender el origen, el procesado y cómo preparar un café etíope en casa:</p>

      <div class="video-grid">
        <a
          class="video-card"
          href="https://www.youtube.com/results?search_query=cafe+de+etiopia+especialidad+origen"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="video-thumb video-thumb--warm">
            <img
              src="https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=480&q=70&auto=format&fit=crop"
              alt="Tueste de café" loading="lazy"
             width="480" height="320" />
            <div class="play-btn">
              <div class="play-circle">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-channel">YouTube · Origen</div>
            <div class="video-title">Café de Etiopía: entre el mito y el terroir</div>
            <div class="yt-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c00"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8z"/><path fill="#fff" d="M9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>
              Ver en YouTube
            </div>
          </div>
        </a>

        <a
          class="video-card"
          href="https://www.youtube.com/results?search_query=proceso+lavado+natural+cafe+especialidad"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="video-thumb video-thumb--green">
            <img
              src="https://images.unsplash.com/photo-1508767986891-c2bc4b9e2059?w=480&q=70&auto=format&fit=crop"
              alt="Proceso natural de café" loading="lazy"
             width="480" height="320" />
            <div class="play-btn">
              <div class="play-circle">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-channel">YouTube · Proceso</div>
            <div class="video-title">Lavado vs. Natural: la diferencia en taza explicada</div>
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
        <textarea id="commentBody" class="comment-box" maxlength="1000" placeholder="¿Has probado algún café etíope que te haya sorprendido? Cuéntanos."></textarea>
        <button id="sendComment" class="comment-send" type="button">Publicar respuesta</button>
        <div id="commentStatus" class="comment-status"></div>
        <div id="commentList" class="comment-list"></div>
      </section>

    </article>

    <div class="cta-box">
      <p class="cta-eyebrow">Comunidad Etiove</p>
      <h2 class="cta-title">Descubre cafés etíopes<br><em>recomendados por la comunidad</em></h2>
      <p class="cta-sub">En Etiove encontrarás catadores que llevan años explorando Etiopía. Comparte tu experiencia o pide recomendaciones.</p>
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
      <a class="related-card" href="/blog/guia-de-molienda-por-metodo.html">
        <img class="related-thumb" src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=75&auto=format&fit=crop" alt="Guía de Molienda por Método: de V60 a Espresso" loading="lazy" width="400" height="225" />
        <div class="related-body">
          <span class="related-tag">Tutorial</span>
          <p class="related-title">Guía de Molienda por Método: de V60 a Espresso</p>
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
      <a class="post-nav-link" href="/blog/guia-de-molienda-por-metodo.html">
        <p class="post-nav-label">Siguiente →</p>
        <p class="post-nav-title">Guía de Molienda por Método: de V60 a Espresso</p>
      </a>
    </nav>`
};

module.exports = {
  comoElegirElMejorCafeDeEtiopia,
};
