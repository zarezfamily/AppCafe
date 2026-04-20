import { useMemo } from 'react';
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

  const specialtyItems = useMemo(() => {
    return [...(top100 || [])]
      .filter((item) => (item?.coffeeCategory || 'specialty') === 'specialty')
      .sort((a, b) => Number(b?.rankingScore || 0) - Number(a?.rankingScore || 0));
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top cafés de especialidad"
      subtitle={`Los cafés mejor posicionados ahora mismo en ${country}`}
      helperText="Ranking ETIOVE calculado en backend según calidad, puntuación y confianza."
      items={specialtyItems}
      categoryLabel="Especialidad"
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés de especialidad suficientes en esta vista."
      heroBadge="TOP SPECIALTY"
    />
  );
}
