const legalPages = [
  {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    description:
      'Política de privacidad de Etiove. Cómo recopilamos, usamos y protegemos tus datos personales conforme al RGPD.',
    lastUpdated: '9 de abril de 2026',
    bodyHtml: `
      <h2>1. Responsable del tratamiento</h2>
      <p>El responsable del tratamiento de los datos personales recogidos a través de la aplicación y web Etiove es <strong>Etiove</strong>, con domicilio en España y dirección de contacto: <a href="mailto:privacidad@etiove.com">privacidad@etiove.com</a>.</p>

      <h2>2. Datos que recopilamos</h2>
      <p>Recopilamos únicamente los datos necesarios para el funcionamiento del servicio:</p>
      <ul>
        <li><strong>Datos de cuenta:</strong> correo electrónico y contraseña (almacenada de forma encriptada mediante Firebase Authentication).</li>
        <li><strong>Datos de perfil:</strong> alias o nombre de usuario, foto de perfil (opcional), y preferencias de café (resultado del quiz de sabor).</li>
        <li><strong>Contenido generado:</strong> hilos, respuestas y comentarios publicados en la comunidad.</li>
        <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, sistema operativo y versión de la aplicación, recopilados automáticamente para el correcto funcionamiento del servicio.</li>
      </ul>
      <p>No recopilamos datos bancarios, datos de salud ni ninguna categoría especial de datos personales.</p>

      <h2>3. Finalidad y base legal del tratamiento</h2>
      <ul>
        <li><strong>Prestación del servicio (art. 6.1.b RGPD):</strong> gestión de tu cuenta, acceso a la comunidad y funcionamiento de la app.</li>
        <li><strong>Interés legítimo (art. 6.1.f RGPD):</strong> seguridad de la plataforma, detección de fraude y mejora del servicio.</li>
        <li><strong>Consentimiento (art. 6.1.a RGPD):</strong> comunicaciones opcionales por correo electrónico. Puedes retirar tu consentimiento en cualquier momento.</li>
      </ul>

      <h2>4. Conservación de los datos</h2>
      <p>Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, tus datos personales se borran en un plazo máximo de 30 días, salvo los que debamos conservar por obligación legal.</p>

      <h2>5. Destinatarios y transferencias internacionales</h2>
      <p>Utilizamos <strong>Google Firebase</strong> (Authentication, Firestore, Storage) como proveedor de infraestructura, con servidores en la región <strong>europe-west1</strong> (Bélgica). Google LLC está adherido al Marco de Privacidad de Datos UE-EE.UU. No cedemos tus datos a terceros para fines comerciales.</p>

      <h2>6. Tus derechos</h2>
      <p>Conforme al RGPD, tienes derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
        <li><strong>Supresión:</strong> solicitar el borrado de tus datos.</li>
        <li><strong>Portabilidad:</strong> exportar tus datos en formato legible por máquina (disponible desde tu perfil en la app).</li>
        <li><strong>Oposición y limitación:</strong> oponerte a ciertos tratamientos o solicitar su limitación.</li>
      </ul>
      <p>Puedes ejercer estos derechos escribiendo a <a href="mailto:privacidad@etiove.com">privacidad@etiove.com</a>. También puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>

      <h2>7. Seguridad</h2>
      <p>Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: cifrado en tránsito (HTTPS/TLS), autenticación segura mediante Firebase, y acceso restringido a los datos por parte del equipo.</p>

      <h2>8. Cookies</h2>
      <p>Utilizamos únicamente cookies técnicas necesarias para el funcionamiento del servicio. Para más información consulta nuestra <a href="/cookies.html">Política de Cookies</a>.</p>

      <h2>9. Cambios en esta política</h2>
      <p>Si realizamos cambios relevantes en esta política, te informaremos a través de la aplicación o por correo electrónico con al menos 15 días de antelación.</p>`,
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    description: 'Política de cookies de Etiove. Qué cookies usamos y cómo gestionarlas.',
    lastUpdated: '9 de abril de 2026',
    bodyHtml: `
      <h2>1. ¿Qué son las cookies?</h2>
      <p>Las cookies son pequeños ficheros de texto que se almacenan en tu dispositivo cuando visitas una página web. Permiten que el sitio recuerde información sobre tu visita para mejorar tu experiencia.</p>

      <h2>2. Cookies que utilizamos</h2>
      <p>Etiove utiliza exclusivamente <strong>cookies técnicas estrictamente necesarias</strong>. No utilizamos cookies publicitarias, de seguimiento ni de terceros con fines de marketing.</p>

      <h3>Cookies propias</h3>
      <ul>
        <li><strong>etiove_cookie_consent:</strong> almacena tu decisión sobre el aviso de cookies. Duración: 1 año.</li>
        <li><strong>etiove_web_uid, etiove_web_token:</strong> mantienen tu sesión de usuario iniciada. Se almacenan en localStorage, no en cookies de sesión HTTP. Duración: hasta que cierres sesión.</li>
        <li><strong>etiove_quiz_prefs:</strong> guarda tu perfil sensorial del quiz para no repetirlo en cada visita. Duración: indefinida hasta que lo borres.</li>
      </ul>

      <h3>Cookies de terceros</h3>
      <ul>
        <li><strong>Google Firebase:</strong> para autenticación y base de datos en tiempo real. Firebase puede establecer cookies técnicas relacionadas con la sesión. Consulta la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">política de privacidad de Google</a>.</li>
        <li><strong>Google Fonts:</strong> cargamos tipografías desde los servidores de Google. Esta petición puede registrar tu IP. Consulta la política de Google para más información.</li>
      </ul>

      <h2>3. Cómo gestionar las cookies</h2>
      <p>Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que bloquear las cookies técnicas puede afectar al funcionamiento correcto de la web y la app.</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener">Microsoft Edge</a></li>
      </ul>

      <h2>4. Actualizaciones</h2>
      <p>Podemos actualizar esta política cuando cambiemos las cookies que utilizamos. La fecha de última actualización aparece al inicio de esta página.</p>

      <h2>5. Contacto</h2>
      <p>Para cualquier consulta sobre el uso de cookies escríbenos a <a href="mailto:privacidad@etiove.com">privacidad@etiove.com</a>.</p>`,
  },
  {
    slug: 'terminos',
    title: 'Términos y Condiciones',
    description:
      'Términos y condiciones de uso de Etiove. Condiciones de acceso y uso de la app y la comunidad.',
    lastUpdated: '9 de abril de 2026',
    bodyHtml: `
      <h2>1. Aceptación de los términos</h2>
      <p>Al acceder o utilizar la aplicación y web de Etiove, aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguno de ellos, debes dejar de usar el servicio.</p>

      <h2>2. Descripción del servicio</h2>
      <p>Etiove es una plataforma comunitaria dedicada al café de especialidad que ofrece: comunidad de usuarios, blog editorial, quiz de perfil sensorial y recomendaciones de café. El servicio se presta a través de la aplicación móvil (iOS y Android) y la web <a href="https://etiove.com">etiove.com</a>.</p>

      <h2>3. Registro y cuenta</h2>
      <p>Para acceder a ciertas funcionalidades debes crear una cuenta con un correo electrónico válido. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas desde tu cuenta. Debes notificarnos inmediatamente cualquier uso no autorizado a <a href="mailto:hola@etiove.com">hola@etiove.com</a>.</p>
      <p>Debes tener al menos 16 años para registrarte. Al crear una cuenta declaras cumplir este requisito.</p>

      <h2>4. Normas de conducta en la comunidad</h2>
      <p>Al participar en la comunidad de Etiove te comprometes a:</p>
      <ul>
        <li>Publicar contenido relacionado con el café de especialidad, la gastronomía o temas afines.</li>
        <li>Tratar con respeto a los demás miembros de la comunidad.</li>
        <li>No publicar contenido ofensivo, discriminatorio, spam, o que infrinja derechos de terceros.</li>
        <li>No suplantar la identidad de otras personas o marcas.</li>
        <li>No publicar información falsa o engañosa.</li>
      </ul>
      <p>Etiove se reserva el derecho de eliminar contenido que incumpla estas normas y de suspender o cancelar cuentas de usuarios que las vulneren reiteradamente.</p>

      <h2>5. Propiedad intelectual</h2>
      <p>Todo el contenido de Etiove (diseño, textos, imágenes, marca) es propiedad de Etiove o de sus licenciantes y está protegido por las leyes de propiedad intelectual. Queda prohibida su reproducción sin autorización expresa.</p>
      <p>El contenido que publicas en la comunidad sigue siendo tuyo. Al publicarlo, nos otorgas una licencia no exclusiva para mostrarlo dentro de la plataforma.</p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>Etiove no se hace responsable de los daños derivados del uso o imposibilidad de uso del servicio, interrupciones técnicas, ni del contenido publicado por usuarios. El servicio se presta "tal cual" y nos reservamos el derecho de modificarlo o interrumpirlo en cualquier momento.</p>

      <h2>7. Modificaciones</h2>
      <p>Podemos actualizar estos términos en cualquier momento. Te notificaremos los cambios relevantes con al menos 15 días de antelación. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos.</p>

      <h2>8. Ley aplicable y jurisdicción</h2>
      <p>Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del usuario, salvo que la normativa aplicable establezca otro fuero.</p>

      <h2>9. Contacto</h2>
      <p>Para cualquier consulta sobre estos términos puedes escribirnos a <a href="mailto:hola@etiove.com">hola@etiove.com</a>.</p>`,
  },
];

module.exports = {
  legalPages,
};
