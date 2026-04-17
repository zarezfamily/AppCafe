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
      title="Últimos cafés descubiertos"
      subtitle="Las incorporaciones más recientes de la comunidad ETIOVE"
      helperText="Ideal para seguir nuevos lanzamientos, cafés recién añadidos y descubrimientos recientes."
      items={ultimos100}
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Todavía no hay cafés recientes en esta vista."
    />
  );
}
