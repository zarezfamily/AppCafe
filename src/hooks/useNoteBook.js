import { useMemo, useState } from 'react';

const METODOS_PREPARACION = [
  'V60',
  'Espresso',
  'Chemex',
  'Aeropress',
  'Prensa francesa',
  'Moka',
  'Cold brew',
  'Otro',
];
const CONTEXTOS = [
  'Mañana solo',
  'Mañana con amigos',
  'Tarde solo',
  'Tarde con amigos',
  'Noche',
  'Viaje',
  'Presentación',
  'Estudio',
  'Trabajo',
  'En casa',
];

export default function useNoteBook() {
  const [catas, setCatas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [modalDetailOpen, setModalDetailOpen] = useState(false);
  const [cataSeleccionada, setCataSeleccionada] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todo'); // hoy, semana, mes, todo
  const [guardando, setGuardando] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Campos del formulario
  const [cafeNombre, setCafeNombre] = useState('');
  const [cafeId, setCafeId] = useState('');
  const [fechaHora, setFechaHora] = useState(new Date().toISOString());
  const [metodoPreparacion, setMetodoPreparacion] = useState('Espresso');
  const [dosis, setDosis] = useState('18');
  const [agua, setAgua] = useState('30');
  const [temperatura, setTemperatura] = useState('92');
  const [tiempoExtraccion, setTiempoExtraccion] = useState('28');
  const [puntuacion, setPuntuacion] = useState(3);
  const [notas, setNotas] = useState('');
  const [foto, setFoto] = useState(null);
  const [contexto, setContexto] = useState('Mañana solo');

  const irLimpiar = () => {
    setCafeNombre('');
    setCafeId('');
    setFechaHora(new Date().toISOString());
    setMetodoPreparacion('Espresso');
    setDosis('18');
    setAgua('30');
    setTemperatura('92');
    setTiempoExtraccion('28');
    setPuntuacion(3);
    setNotas('');
    setFoto(null);
    setContexto('Mañana solo');
    setIsEditing(false);
  };

  const irAbrirModal = (cafeExistente = null) => {
    if (cafeExistente) {
      setCafeNombre(cafeExistente.nombre || cafeExistente.cafeNombre);
      setCafeId(cafeExistente.id || '');
    }
    setModalFormOpen(true);
  };

  const irCerrarModal = () => {
    setModalFormOpen(false);
    irLimpiar();
  };

  const irAbrirDetail = (cata) => {
    setCataSeleccionada(cata);
    setModalDetailOpen(true);
  };

  const irCerrarDetail = () => {
    setModalDetailOpen(false);
    setCataSeleccionada(null);
  };

  const catasFiltradas = useMemo(() => {
    const ahora = new Date();
    const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filtradas = [...catas];
    if (filtroPeriodo === 'hoy') {
      filtradas = filtradas.filter(
        (c) => new Date(c.fechaHora).toDateString() === ahora.toDateString()
      );
    } else if (filtroPeriodo === 'semana') {
      filtradas = filtradas.filter((c) => new Date(c.fechaHora) >= hace7);
    } else if (filtroPeriodo === 'mes') {
      filtradas = filtradas.filter((c) => new Date(c.fechaHora) >= hace30);
    }

    return filtradas.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
  }, [catas, filtroPeriodo]);

  const stats = useMemo(() => {
    if (catasFiltradas.length === 0)
      return { totalCatas: 0, promedioPuntuacion: 0, cafesProbados: 0 };
    const promedio =
      catasFiltradas.reduce((sum, c) => sum + (c.puntuacion || 0), 0) / catasFiltradas.length;
    const cafeUnicos = new Set(catasFiltradas.map((c) => c.cafeNombre)).size;
    return {
      totalCatas: catasFiltradas.length,
      promedioPuntuacion: promedio.toFixed(1),
      cafesProbados: cafeUnicos,
    };
  }, [catasFiltradas]);

  return {
    // Estado
    catas,
    setCatas,
    cargando,
    setCargando,
    modalFormOpen,
    setModalFormOpen,
    modalDetailOpen,
    setModalDetailOpen,
    cataSeleccionada,
    filtroPeriodo,
    setFiltroPeriodo,
    guardando,
    setGuardando,

    // Formulario
    cafeNombre,
    setCafeNombre,
    cafeId,
    setCafeId,
    fechaHora,
    setFechaHora,
    metodoPreparacion,
    setMetodoPreparacion,
    dosis,
    setDosis,
    agua,
    setAgua,
    tiempoExtraccion,
    setTiempoExtraccion,
    temperatura,
    setTemperatura,
    puntuacion,
    setPuntuacion,
    notas,
    setNotas,
    foto,
    setFoto,
    contexto,
    setContexto,

    // Edición
    isEditing,
    setIsEditing,

    // Métodos
    irLimpiar,
    irAbrirModal,
    irCerrarModal,
    irAbrirDetail,
    irCerrarDetail,
    catasFiltradas,
    stats,

    // Constantes
    METODOS_PREPARACION,
    CONTEXTOS,
  };
}
