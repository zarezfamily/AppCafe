import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function TopCafesTab({
  s,
  setActiveTab,
  premiumAccent,
  perfil,
  cargando,
  top100,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  const country = perfil?.pais || 'España';

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top cafés de especialidad"
      subtitle={`Los cafés mejor valorados ahora mismo en ${country}`}
      helperText="Ordenados por puntuación media de la comunidad. Aquí es donde empiezas si quieres descubrir lo mejor de ETIOVE."
      items={top100}
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés puntuados en esta vista."
    />
  );
}
