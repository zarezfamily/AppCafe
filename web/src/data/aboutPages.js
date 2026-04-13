const aboutSectionsHtml = `
    <div class="section">
      <p class="section-label">El origen</p>
      <h2>De aficionados a constructores</h2>
      <p>Todo empezó con una pregunta que muchos nos hacemos la primera vez que probamos un café verdaderamente bueno: ¿cómo no sabía esto antes? El salto del café comercial al café de especialidad no es solo de calidad — es de perspectiva. Y esa perspectiva necesitaba un hogar.</p>
      <p>Construimos Etiove porque echábamos en falta un espacio en español donde hablar de tuestes, orígenes, métodos de preparación y molinillos sin que te trataran como a un friki o como a un consumidor. Un sitio donde el conocimiento fluyera entre iguales y donde descubrir un Yirgacheffe etíope o un Geisha panameño fuera tan emocionante como lo es en realidad.</p>
    </div>

    <div class="divider"><span class="divider-dot"></span></div>

    <div class="section">
      <p class="section-label">Misión</p>
      <h2>Democratizar el conocimiento del café</h2>
      <p>El café de especialidad tiene una barrera de entrada percibida — terminología técnica, precios más altos, equipamiento especializado — que en realidad es mucho menor de lo que parece. Nuestra misión es bajar esa barrera sin bajar el nivel.</p>
      <p>Queremos que cualquier persona que sienta curiosidad por el café pueda encontrar en Etiove la guía, la comunidad y las herramientas para explorar a su ritmo. Sin esnobismo, sin barreras.</p>
    </div>

    <div class="divider"><span class="divider-dot"></span></div>

    <div class="section">
      <p class="section-label">Valores</p>
      <h2>Lo que nos guía</h2>
      <div class="values-grid">
        <div class="value-card">
          <div class="value-num">01</div>
          <p class="value-title">Honestidad sobre el producto</p>
          <p class="value-text">No patrocinamos marcas ni cobramos por aparecer en recomendaciones. Lo que mostramos es lo que realmente creemos que merece tu atención.</p>
        </div>
        <div class="value-card">
          <div class="value-num">02</div>
          <p class="value-title">Comunidad sin jerarquías</p>
          <p class="value-text">El catador con 10 años de experiencia y el que acaba de descubrir el V60 tienen el mismo derecho a hablar y a ser escuchados.</p>
        </div>
        <div class="value-card">
          <div class="value-num">03</div>
          <p class="value-title">Impacto real en el origen</p>
          <p class="value-text">Consumir café de especialidad es votar con el dinero por productores que cuidan la tierra, el grano y las personas detrás de cada cosecha.</p>
        </div>
        <div class="value-card">
          <div class="value-num">04</div>
          <p class="value-title">Privacidad y transparencia</p>
          <p class="value-text">Tus datos son tuyos. No los vendemos, no hacemos publicidad segmentada y puedes exportarlos o eliminarlos cuando quieras.</p>
        </div>
      </div>
    </div>

    <div class="divider"><span class="divider-dot"></span></div>

    <div class="section">
      <p class="section-label">La comunidad</p>
      <h2>Números que importan</h2>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">☕</div>
          <div class="stat-label">Comunidad activa</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">🌍</div>
          <div class="stat-label">Orígenes explorados</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">🇪🇸</div>
          <div class="stat-label">Hecho en España</div>
        </div>
      </div>
    </div>

    <div class="cta-block">
      <p class="cta-eyebrow">Únete</p>
      <h2 class="cta-title">Empieza a explorar hoy</h2>
      <p class="cta-sub">El quiz de sabor te ayuda a descubrir qué café encaja con tu paladar en menos de 2 minutos.</p>
      <a class="cta-btn" href="/#quizweb">
        Hacer el quiz de sabor
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    </div>`;

const aboutPages = [
  {
    slug: 'about',
    title: 'Sobre Etiove | La comunidad de café de especialidad',
    description: 'Etiove nació de la convicción de que el café de especialidad merece una comunidad a su altura. Conoce nuestra historia, misión y valores.',
    robots: 'index, follow',
    ogTitle: 'Sobre Etiove | La comunidad de café de especialidad',
    ogDescription: 'Etiove nació de la convicción de que el café de especialidad merece una comunidad a su altura.',
    schemaName: 'Sobre Etiove',
    schemaDescription: 'Historia, misión y valores de Etiove, la mayor comunidad de café de especialidad en español.',
    bodyHtml: aboutSectionsHtml,
  },
  {
    slug: 'sobre',
    title: 'Sobre Etiove | La comunidad de café de especialidad',
    description: 'Etiove nació de la convicción de que el café de especialidad merece una comunidad a su altura. Conoce nuestra historia, misión y valores.',
    robots: 'index, follow',
    ogTitle: 'Sobre Etiove | La comunidad de café de especialidad',
    ogDescription: 'Etiove nació de la convicción de que el café de especialidad merece una comunidad a su altura.',
    schemaName: 'Sobre Etiove',
    schemaDescription: 'Historia, misión y valores de Etiove, la mayor comunidad de café de especialidad en español.',
    bodyHtml: aboutSectionsHtml,
  },
];

module.exports = {
  aboutPages,
};
