export const QUIZ = [
  {
    id: 'tueste',
    pregunta: '¿Qué tueste prefieres?',
    nota: 'El tueste define el carácter de cada taza',
    opciones: [
      { label: 'Claro', desc: 'Floral · Ácido · Delicado', value: 'claro' },
      { label: 'Medio', desc: 'Equilibrado · Versátil · Limpio', value: 'medio' },
      { label: 'Oscuro', desc: 'Intenso · Denso · Ahumado', value: 'oscuro' },
    ],
  },
  {
    id: 'origen',
    pregunta: '¿Qué origen te atrae?',
    nota: 'El origen marca el alma del grano',
    opciones: [
      { label: 'África', desc: 'Etiopía · Kenia · Ruanda', value: 'africa' },
      { label: 'América', desc: 'Colombia · Costa Rica · Panamá', value: 'america' },
      { label: 'Asia', desc: 'Indonesia · Yemen · India', value: 'asia' },
      { label: 'Sorpréndeme', desc: 'Cualquier origen', value: 'cualquiera' },
    ],
  },
  {
    id: 'acidez',
    pregunta: '¿Cómo te gusta la acidez?',
    nota: 'La acidez es viveza, no agresividad',
    opciones: [
      { label: 'Alta', desc: 'Brillante · Viva · Expresiva', value: 'alta' },
      { label: 'Media', desc: 'Equilibrada · Presente · Limpia', value: 'media' },
      { label: 'Baja', desc: 'Suave · Redonda · Envolvente', value: 'baja' },
    ],
  },
  {
    id: 'sabor',
    pregunta: '¿Qué perfil te seduce?',
    nota: 'Cada taza es un universo de matices',
    opciones: [
      { label: 'Floral', desc: 'Jazmín · Rosa · Bergamota', value: 'floral' },
      { label: 'Frutal', desc: 'Cereza · Arándano · Naranja', value: 'frutal' },
      { label: 'Chocolate', desc: 'Cacao · Caramelo · Nuez', value: 'chocolate' },
      { label: 'Especias', desc: 'Canela · Cardamomo · Vainilla', value: 'especias' },
    ],
  },
];

export const QUIZ_STEP_NUMERALS = ['I', 'II', 'III', 'IV'];

export const QUIZ_VALUE_LABELS = {
  tueste: { claro: 'Claro', medio: 'Medio', oscuro: 'Oscuro' },
  origen: { africa: 'África', america: 'América', asia: 'Asia', cualquiera: 'Sorpréndeme' },
  acidez: { alta: 'Alta', media: 'Media', baja: 'Baja' },
  sabor: { floral: 'Floral', frutal: 'Frutal', chocolate: 'Chocolate', especias: 'Especias' },
};

export const QUIZ_FIELD_NAMES = {
  tueste: 'Tueste',
  origen: 'Origen',
  acidez: 'Acidez',
  sabor: 'Perfil',
};
