import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function UltimosAnadidosTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  ultimos100,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Últimos añadidos"
      subtitle="Mostrando los 100 más recientes de la comunidad"
      items={ultimos100}
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés."
    />
  );
}
