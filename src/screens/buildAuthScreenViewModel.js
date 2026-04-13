const AUTH_MODE_COPY = {
  login: {
    kicker: {
      withAccount: 'BIENVENIDO DE NUEVO',
      withoutAccount: 'BIENVENIDO',
    },
    title: 'Accede a tu cuenta',
    subtitle: 'Entra para seguir tu colección, nivel y ritual de cata.',
    primaryAction: 'Entrar',
  },
  register: {
    kicker: 'NUEVA MEMBRESÍA',
    title: 'Crea tu cuenta',
    subtitle: 'Únete a Etiove y empieza a construir tu perfil de catador.',
    primaryAction: 'Crear cuenta',
  },
  reset: {
    kicker: 'RECUPERACIÓN SEGURA',
    title: 'Recupera tu acceso',
    subtitle: 'Te enviaremos un enlace para restaurar tu contraseña.',
    primaryAction: 'Enviar enlace',
  },
};

export default function buildAuthScreenViewModel({ modo, hasAccount, faceIdDisponible, faceIdGuardado, cargando }) {
  const modeConfig = AUTH_MODE_COPY[modo] || AUTH_MODE_COPY.login;
  const kicker = modo === 'login'
    ? (hasAccount ? modeConfig.kicker.withAccount : modeConfig.kicker.withoutAccount)
    : modeConfig.kicker;

  return {
    kicker,
    title: modeConfig.title,
    subtitle: modeConfig.subtitle,
    primaryAction: modeConfig.primaryAction,
    showPasswordField: modo !== 'reset',
    showRememberToggle: modo === 'login',
    showFaceIdButton: modo === 'login' && !!faceIdDisponible && !!faceIdGuardado,
    disablePrimaryAction: !!cargando,
    disableSecondaryAction: !!cargando,
    isLoginMode: modo === 'login',
  };
}
