function renderSocialLinks() {
  return `
        <span class="social-row-inline">
          <a class="social-link" href="https://instagram.com/etiove_cafe" target="_blank" aria-label="Instagram @etiove_cafe">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a class="social-link" href="https://x.com/etiove_cafe" target="_blank" aria-label="X @etiove_cafe">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a class="social-link" href="https://tiktok.com/@etiove" target="_blank" aria-label="TikTok @etiove">
            <svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z"/></svg>
          </a>
        </span>`;
}

function renderLegalFooter() {
  return `
  <footer>
    <nav class="footer-nav" aria-label="Navegación del sitio">
      <div class="footer-nav-group">
        <span class="footer-nav-label">Explorar</span>
        <a class="footer-nav-link" href="/">Inicio</a>
        <a class="footer-nav-link" href="/blog/">Blog</a>
        <a class="footer-nav-link" href="/comunidad.html">Comunidad</a>
        <a class="footer-nav-link" href="/#quizweb">Quiz de sabor</a>
        <a class="footer-nav-link" href="/about.html">Sobre Etiove</a>
      </div>
    </nav>

    <p class="footer-copy">
      <span>© 2026 Etiove. Hecho con ☕ en España.</span>

      <span class="footer-copy-center">
        <span class="footer-wordmark-sm">Etiove</span>
${renderSocialLinks()}
      </span>

      <span class="footer-legal-links">
        <a class="footer-legal-link" href="/privacidad.html">Privacidad</a>
        <a class="footer-legal-link" href="/cookies.html">Cookies</a>
        <a class="footer-legal-link" href="/terminos.html">Términos</a>
      </span>
    </p>
  </footer>`;
}

function renderSiteFooter() {
  return `
  <footer>
    <nav class="footer-nav" aria-label="Navegación del sitio">
      <div class="footer-nav-group">
        <span class="footer-nav-label">Explorar</span>
        <a class="footer-nav-link" href="/">Inicio</a>
        <a class="footer-nav-link" href="/blog/">Blog</a>
        <a class="footer-nav-link" href="/comunidad.html">Comunidad</a>
        <a class="footer-nav-link" href="/#quizweb">Quiz de sabor</a>
        <a class="footer-nav-link" href="/about.html">Sobre Etiove</a>
      </div>
    </nav>

    <p class="footer-copy">
      <span>© 2026 Etiove. Hecho con ☕ en España.</span>

      <span class="footer-copy-center">
        <span class="footer-wordmark-sm">Etiove</span>
${renderSocialLinks()}
      </span>

      <span class="footer-legal-links">
        <a class="footer-legal-link" href="/privacidad.html">Privacidad</a>
        <a class="footer-legal-link" href="/cookies.html">Cookies</a>
        <a class="footer-legal-link" href="/terminos.html">Términos</a>
      </span>
    </p>
  </footer>`;
}

function renderBlogPostFooter() {
  return `
  <footer>
    <p class="footer-copy">
      <span>© 2026 Etiove. Hecho con ☕ en España.</span>

      <span class="footer-copy-center">
        <span class="footer-wordmark-sm">Etiove</span>
${renderSocialLinks()}
      </span>

      <span class="footer-legal-group">
        <a class="footer-legal-link" href="/privacidad.html">Privacidad</a>
        <a class="footer-legal-link" href="/cookies.html">Cookies</a>
        <a class="footer-legal-link" href="/terminos.html">Términos</a>
      </span>
    </p>
  </footer>`;
}

function renderBlogPostNav() {
  return `
  <nav class="site-nav" aria-label="Navegación principal">
    <a class="nav-wordmark" href="/">Etiove</a>
    <button class="nav-hamburger" id="navHamburger" aria-label="Menú" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button>
    <div class="nav-links" id="navLinks">
      <a class="nav-link" href="/">Inicio</a>
      <a class="nav-link nav-link--active" href="/blog/">Blog</a>
      <a class="nav-link" href="/comunidad.html">Comunidad</a>
    </div>
  </nav>`;
}

function renderLegalNav() {
  return `
  <nav>
    <a class="nav-wordmark" href="/">Etiove</a>
    <button class="nav-hamburger" id="navHamburger" aria-label="Menú" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="nav-links" id="navLinks">
      <a class="nav-link" href="/">Inicio</a>
      <a class="nav-link" href="/blog/">Blog</a>
      <a class="nav-link" href="/comunidad.html">Comunidad</a>
    </div>
  </nav>`;
}

function renderScrollTopButton() {
  return `
  <button class="scroll-top" id="scrollTopBtn" aria-label="Volver arriba">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
  </button>`;
}

module.exports = {
  renderBlogPostFooter,
  renderBlogPostNav,
  renderLegalFooter,
  renderLegalNav,
  renderSiteFooter,
  renderScrollTopButton,
};
