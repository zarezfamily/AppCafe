const linking = {
  prefixes: ['https://etiove.com', 'etiove://'],
  config: {
    screens: {
      Comunidad: {
        path: 'comunidad.html',
        parse: {
          thread: (threadId) => `${threadId}`,
        },
      },
      // Agrega aquí otras rutas si lo necesitas
    },
  },
};

export default linking;
