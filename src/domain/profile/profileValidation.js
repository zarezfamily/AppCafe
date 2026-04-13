export const isValidProfileEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim());

export const hasRequiredProfileFields = ({ nombre, apellidos, alias, email }) => (
  !!String(nombre || '').trim()
  && !!String(apellidos || '').trim()
  && !!String(alias || '').trim()
  && !!String(email || '').trim()
);

export const buildProfileDraft = ({
  nombre,
  alias,
  apellidos,
  email,
  telefono,
  pais,
  foto,
}) => ({
  nombre: String(nombre || '').trim(),
  alias: String(alias || '').trim(),
  apellidos: String(apellidos || '').trim(),
  email: String(email || '').trim(),
  telefono: telefono || '',
  pais: pais || 'España',
  foto: foto || null,
});
