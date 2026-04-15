const arabicaVsRobusta = {
  slug: 'arabica-vs-robusta',
  title: 'Arábica vs Robusta: La Diferencia que Cambia tu Café',
  description:
    '¿Qué diferencia hay entre café arábica y robusta? Sabor, cafeína, precio, cultivo y cuándo usar cada uno. La guía definitiva en español.',
  ogDescription:
    '¿Qué diferencia hay entre café arábica y robusta? Sabor, cafeína, precio, cultivo y cuándo usar cada uno. La guía definitiva en español.',
  twitterTitle: 'Arábica vs Robusta: La Diferencia que Cambia tu Café',
  twitterDescription:
    'Sabor, cafeína, precio y cuándo usar cada variedad. Todo lo que necesitas saber sobre arábica y robusta.',
  canonicalUrl: 'https://etiove.com/blog/arabica-vs-robusta.html',
  prevUrl: '/blog/cold-brew-en-casa-guia-completa.html',
  extraHeadHtml:
    '<link rel="search" type="application/opensearchdescription+xml" title="Blog Etiove" href="/opensearch.xml" />',
  bodyWrapperClass: 'container',
  bodyInnerClass: 'post-body',
  hero: {
    image:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1400&q=80&auto=format&fit=crop',
    imageSocial:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=85&auto=format&fit=crop',
    imageAlt: 'Granos de café arábica de especialidad en mano',
    tag: 'Guía · 10 abril 2026 · 6 min de lectura',
    title: 'Arábica vs Robusta: La Diferencia que Cambia tu Café',
    meta: 'Por el equipo de Etiove · Foto: Unsplash',
  },
  inlineCss: String.raw`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --ink: #1c120d; --ink-soft: #5d4030; --ink-muted: #9a7963; --cream: #f6efe7; --cream-alt: #fffaf5; --accent: #8f5e3b; --accent-deep: #5d4030; --border: #e4d3c2; --border-soft: rgba(228,211,194,0.5); }
    html { scroll-behavior: smooth; }
    body { font-family: 'Source Serif 4', Georgia, serif; color: var(--ink); background: radial-gradient(circle at 10% -10%, rgba(143,94,59,.12) 0%, transparent 45%), radial-gradient(circle at 100% 20%, rgba(93,64,48,.07) 0%, transparent 42%), var(--cream); min-height: 100vh; line-height: 1.75; }
    body > nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; background: rgba(246,239,231,.97); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-soft); }
    .nav-wordmark { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; letter-spacing: 4px; color: var(--ink); text-decoration: none; text-transform: uppercase; }
    .nav-links { display: flex; align-items: center; gap: 32px; }
    .nav-link { font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); text-decoration: none; transition: color .3s; }
    .nav-link:hover { color: var(--accent); }
    #readProgress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg,var(--accent),#c99557); z-index: 200; width: 0%; transition: width .1s linear; }
    .post-hero { position: relative; height: min(72vh, 540px); overflow: hidden; margin-top: 62px; }
    .hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(28,18,13,.15) 0%, rgba(28,18,13,.65) 100%); }
    .hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; }
    .hero-tag { display: inline-block; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,236,210,.85); background: rgba(143,94,59,.65); border-radius: 999px; padding: 4px 10px; margin-bottom: 10px; }
    .hero-title { font-family: 'Playfair Display', serif; font-size: clamp(26px,5vw,48px); font-weight: 700; color: #fdf8f1; line-height: 1.15; margin-bottom: 8px; max-width: 700px; }
    .hero-meta { font-family: -apple-system, sans-serif; font-size: 12px; color: rgba(253,248,241,.55); letter-spacing: 0.5px; }
    .container { max-width: 740px; margin: 0 auto; padding: 56px 24px 80px; }
    .post-body { font-size: clamp(17px,2vw,19px); color: #2e1e15; }
    .post-body p { margin-bottom: 24px; }
    .post-body h2 { font-family: 'Playfair Display', serif; font-size: clamp(22px,3.5vw,30px); font-weight: 700; color: var(--ink); margin: 48px 0 18px; line-height: 1.2; }
    .post-body h3 { font-family: 'Playfair Display', serif; font-size: clamp(18px,2.5vw,22px); font-weight: 500; color: var(--ink); margin: 32px 0 12px; }
    .post-body strong { color: var(--ink); font-weight: 700; }
    .post-body em { font-style: italic; color: var(--ink-soft); }
    .post-body a { color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; }

    /* Comparison table */
    .compare-table { width: 100%; border-collapse: collapse; margin: 28px 0 36px; font-size: 15px; }
    .compare-table thead tr { background: var(--ink); color: #fff9f1; }
    .compare-table thead th { padding: 12px 16px; text-align: left; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, sans-serif; font-weight: 600; }
    .compare-table tbody tr { border-bottom: 1px solid var(--border); }
    .compare-table tbody tr:nth-child(even) { background: rgba(246,239,231,.5); }
    .compare-table td { padding: 12px 16px; color: var(--ink-soft); line-height: 1.5; }
    .compare-table td:first-child { color: var(--ink); font-weight: 600; font-family: -apple-system, sans-serif; font-size: 13px; letter-spacing: 0.5px; }
    .compare-table .win { color: #4f7a53; font-weight: 700; }
    .compare-table .neutral { color: var(--ink-muted); }

    /* Two-col cards */
    .versus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 28px 0 36px; }
    .versus-card { border-radius: 14px; padding: 24px 20px; }
    .versus-card.arabica { background: linear-gradient(145deg,#1f130d,#2d1a10); border: 1px solid rgba(201,149,87,.3); }
    .versus-card.robusta { background: var(--cream-alt); border: 1px solid var(--border); }
    .versus-name { font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 12px; }
    .versus-card.arabica .versus-name { color: rgba(205,165,120,.7); }
    .versus-card.robusta .versus-name { color: var(--ink-muted); }
    .versus-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; line-height: 1; margin-bottom: 14px; }
    .versus-card.arabica .versus-title { color: #f4dfc8; }
    .versus-card.robusta .versus-title { color: var(--ink); }
    .versus-trait { font-size: 13px; line-height: 1.6; margin-bottom: 6px; padding-left: 14px; position: relative; }
    .versus-trait::before { content: '—'; position: absolute; left: 0; }
    .versus-card.arabica .versus-trait { color: rgba(255,244,234,.55); }
    .versus-card.robusta .versus-trait { color: var(--ink-muted); }

    /* Tip */
    .tip { border-left: 4px solid var(--accent); background: rgba(143,94,59,.07); border-radius: 0 12px 12px 0; padding: 18px 20px; margin: 32px 0; font-size: 17px; line-height: 1.7; }
    .tip strong { color: var(--accent-deep); }

    /* Post actions & comments */
    @media (max-width: 600px) { .versus-grid { grid-template-columns: 1fr; } .related-grid { grid-template-columns: 1fr; } .cta-box { padding: 28px 20px; } }`,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Arábica vs Robusta: La Diferencia que Cambia tu Café',
    description:
      '¿Qué diferencia hay entre café arábica y robusta? Sabor, cafeína, precio, cultivo y cuándo usar cada uno.',
    datePublished: '2026-04-10',
    dateModified: '2026-04-10',
    author: {
      '@type': 'Organization',
      name: 'Etiove',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Etiove',
      url: 'https://etiove.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://etiove.com/favicon.svg',
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://etiove.com/blog/arabica-vs-robusta.html',
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1400&q=80&auto=format&fit=crop',
      width: 1400,
      height: 700,
      caption: 'Granos de café arábica de especialidad',
    },
    wordCount: 1150,
    timeRequired: 'PT6M',
  },
  extraJsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Cuál tiene más cafeína, arábica o robusta?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'El robusta tiene casi el doble de cafeína que el arábica: entre 2,7% y 4% en robusta frente al 1,2% a 1,5% del arábica. Si buscas efecto estimulante máximo, el robusta gana. Si buscas sabor complejo, el arábica es muy superior.',
          },
        },
        {
          '@type': 'Question',
          name: '¿El café de especialidad es siempre arábica?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Casi siempre sí. El café de especialidad (puntuación SCA de 80+) es prácticamente siempre de la especie arábica. El robusta raramente alcanza esas puntuaciones por su perfil sensorial más limitado, aunque existen robustas de calidad para espresso.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Por qué el robusta es más barato que el arábica?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'El arábica es más difícil de cultivar: necesita altitud, temperaturas específicas, más agua y es más susceptible a plagas. El robusta crece en climas más duros y produce más kilos por árbol, lo que reduce el coste de producción considerablemente.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué es mejor para espresso, arábica o robusta?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Depende del resultado que busques. El arábica de especialidad da espressos complejos con notas frutales y achocolatadas. El robusta añade más crema (crema más densa y persistente) y más cafeína. Muchos blends de espresso italianos mezclan ambos por esta razón.',
          },
        },
      ],
    },
  ],
  breadcrumbJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://etiove.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://etiove.com/blog/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Arábica vs Robusta: La Diferencia que Cambia tu Café',
        item: 'https://etiove.com/blog/arabica-vs-robusta.html',
      },
    ],
  },
  bodyHtml: String.raw`<p>Si alguna vez has leído el packaging de un café y has visto "100% arábica" impreso en grande, ya sabes que es un argumento de venta. Pero ¿qué significa realmente? ¿Es siempre mejor el arábica que el robusta? ¿Por qué existe el robusta si el arábica es superior? La respuesta, como casi todo en el café, es más interesante de lo que parece.</p>

      <h2>Las dos especies principales</h2>

      <p>Del café se cultivan principalmente dos especies: <strong>Coffea arabica</strong> y <strong>Coffea canephora</strong> (conocida comercialmente como robusta). Representan aproximadamente el 60% y el 40% de la producción mundial respectivamente. Son plantas distintas, con genética diferente, que se cultivan en condiciones distintas y producen sabores completamente diferentes.</p>

      <div class="versus-grid">
        <div class="versus-card arabica">
          <p class="versus-name">Arábica</p>
          <p class="versus-title">Coffea arabica</p>
          <p class="versus-trait">Sabor complejo: frutas, flores, chocolate, acidez brillante</p>
          <p class="versus-trait">1,2–1,5% de cafeína</p>
          <p class="versus-trait">Altitud: 600–2.200 metros</p>
          <p class="versus-trait">Más difícil de cultivar, más cara</p>
          <p class="versus-trait">~60% de la producción mundial</p>
        </div>
        <div class="versus-card robusta">
          <p class="versus-name">Robusta</p>
          <p class="versus-title">Coffea canephora</p>
          <p class="versus-trait">Sabor potente: tierra, madera, amargor marcado</p>
          <p class="versus-trait">2,7–4% de cafeína (el doble)</p>
          <p class="versus-trait">Altitud: 0–800 metros</p>
          <p class="versus-trait">Resistente, productiva, más barata</p>
          <p class="versus-trait">~40% de la producción mundial</p>
        </div>
      </div>

      <h2>La diferencia de sabor: por qué importa</h2>

      <p>El arábica tiene más lípidos y azúcares naturales, y menos cafeína. Esa combinación produce un café más aromático, con mayor complejidad sensorial: notas de fruta, flor, caramelo, cítricos, chocolate con leche. La acidez es una característica positiva, no un defecto — es la que da viveza y brillo a la taza.</p>

      <p>El robusta tiene más cafeína y más ácido clorogénico (que produce amargor). Su perfil es más plano y menos complejo: tierra, madera, goma, amargor persistente. Esto no lo convierte en "malo" — simplemente es un perfil diferente con usos distintos.</p>

      <div class="tip">
        <strong>Dato importante:</strong> la mayoría de los cafés comerciales de supermercado son blends de arábica de baja calidad con robusta. El "100% arábica" del packaging no garantiza calidad — solo dice que es de la especie correcta.
      </div>

      <h2>La comparación directa</h2>

      <div style="overflow-x:auto;margin:28px 0 36px;">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Característica</th>
              <th>Arábica</th>
              <th>Robusta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sabor</td>
              <td class="win">Complejo, dulce, aromático</td>
              <td class="neutral">Potente, amargo, terroso</td>
            </tr>
            <tr>
              <td>Cafeína</td>
              <td class="neutral">1,2–1,5%</td>
              <td class="win">2,7–4% (casi el doble)</td>
            </tr>
            <tr>
              <td>Acidez</td>
              <td>Media–alta (brillante)</td>
              <td>Baja (amargo en su lugar)</td>
            </tr>
            <tr>
              <td>Crema en espresso</td>
              <td>Crema fina, fugaz</td>
              <td class="win">Crema densa y persistente</td>
            </tr>
            <tr>
              <td>Precio</td>
              <td>Más caro</td>
              <td class="win">Más barato</td>
            </tr>
            <tr>
              <td>Cultivo</td>
              <td>Exigente, altitud necesaria</td>
              <td class="win">Resistente, fácil de cultivar</td>
            </tr>
            <tr>
              <td>Café de especialidad</td>
              <td class="win">Prácticamente siempre</td>
              <td>Raramente</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>¿Cuándo usa cada uno un profesional?</h2>

      <p>Los baristas y tostadores no descartan el robusta por completo — lo usan con inteligencia. En espresso, muchos blends italianos clásicos llevan un 10–20% de robusta precisamente para aportar más crema, más cuerpo y más cafeína. El resultado es diferente al espresso 100% arábica: más denso, menos complejo, pero con una crema que aguanta más.</p>

      <p>En la preparación de café instantáneo, el robusta domina completamente. Tiene mayor rendimiento en el proceso de extracción industrial y su perfil de sabor más robusto sobrevive mejor a la deshidratación.</p>

      <p>Para filtro, pour-over, prensa francesa o cualquier método que quiera mostrar el carácter del café, el arábica es casi siempre la elección correcta. Su complejidad sensorial brilla en métodos donde el agua tiene tiempo de extraer todos los compuestos aromáticos.</p>

      <h2>¿Y el café de especialidad?</h2>

      <p>El café de especialidad es casi exclusivamente arábica. Para conseguir una puntuación SCA de 80 puntos o más, el café necesita complejidad aromática, dulzor natural y un perfil sensorial que la especie robusta rara vez puede ofrecer. El arábica cultivado a gran altitud, con proceso cuidado y cosecha selectiva, es donde vive el café de especialidad.</p>

      <p>Dentro del arábica existen además variedades específicas con perfiles excepcionales: el <strong>Geisha</strong> de Panamá con sus notas florales y de té, el <strong>Bourbon</strong> con su dulzor achocolatado, el <strong>Heirloom etíope</strong> con su complejidad frutal salvaje. Estas variedades son la cima de lo que el café puede ofrecer — y son todas arábica.</p>

      <h2>¿Cómo saber qué hay en tu café?</h2>

      <p>Si en el packaging pone solo "100% arábica" sin más información sobre el origen, la finca, el proceso o la variedad, probablemente es arábica de calidad baja a media. Un café de especialidad siempre especifica el origen (país, región, finca), el proceso (lavado, natural, honey) y frecuentemente la variedad y la altitud.</p>

      <p>La transparencia es la señal más clara de calidad. Cuando un tostador sabe exactamente de dónde viene cada grano, lo dice.</p>

    <section class="post-actions" id="comentarios"><p class="section-label section-label--accent">Comparte este artículo</p>
      <div class="share-row">
        <a id="shareX" class="share-btn" target="_blank" rel="noopener noreferrer" href="#"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Compartir en X</a>
        <button id="shareInstagram" class="share-btn" type="button"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> Instagram</button>
        <button id="copyLink" class="share-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Copiar enlace</button>
      </div>
      <p class="section-label section-label--accent">Respuestas</p>
      <p id="commentHelp" class="comment-help"></p>
      <textarea id="commentBody" class="comment-box" maxlength="1000" placeholder="¿Prefieres arábica o robusta en tu espresso? ¿Has probado un blend que te haya sorprendido?"></textarea>
      <button id="sendComment" class="comment-send" type="button">Publicar respuesta</button>
      <div id="commentStatus" class="comment-status"></div>
      <div id="commentList" class="comment-list"></div></section>

    <div class="cta-box"><p class="cta-eyebrow">Comunidad Etiove</p>
      <h2 class="cta-title">¿Qué variedad encaja<br>con <em>tu paladar</em>?</h2>
      <p class="cta-sub">Haz el quiz de sabor de Etiove y descubre qué origen y proceso se adapta exactamente a lo que buscas en una taza.</p>
      <div class="cta-btns">
        <a class="cta-btn-primary" href="/#quizweb">Hacer el quiz <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
        <a class="cta-btn-ghost" href="/comunidad.html">Ver la comunidad</a>
      </div>
    </div>

    <section class="related-section">
      <p class="related-label">También te puede interesar</p>
      <div class="related-grid">
        <a class="related-card" href="/blog/cafe-de-especialidad-vs-cafe-normal.html">
          <img class="related-thumb" src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=75&auto=format&fit=crop" alt="Café de especialidad vs café normal" loading="lazy" width="400" height="225" />
          <div class="related-body">
            <span class="related-tag">Análisis</span>
            <p class="related-title">Café de Especialidad vs Café Normal: ¿Cuál es la diferencia real?</p>
          </div>
        </a>
        <a class="related-card" href="/blog/cold-brew-en-casa-guia-completa.html">
          <img class="related-thumb" src="https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=75&auto=format&fit=crop" alt="Cold brew en casa" loading="lazy" width="400" height="225" />
          <div class="related-body">
            <span class="related-tag">Tutorial</span>
            <p class="related-title">Cold Brew en Casa: Guía Completa para Hacerlo Perfecto</p>
          </div>
        </a>
      </div>
    </section>

    <nav class="post-nav" aria-label="Navegación entre artículos">
      <a class="post-nav-link" href="/blog/cold-brew-en-casa-guia-completa.html">
        <p class="post-nav-label">← Anterior</p>
        <p class="post-nav-title">Cold Brew en Casa: Guía Completa</p>
      </a></div>`,
};

module.exports = {
  arabicaVsRobusta,
};
