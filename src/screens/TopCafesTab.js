import { useMemo } from 'react';
import { normalizeCategory, sortByRankingScore } from '../utils/coffeeRanking';
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
    const filtered = (top100 || []).filter((item) => normalizeCategory(item) === 'specialty');
    return sortByRankingScore(filtered);
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top cafés de especialidad"
      subtitle={`Los cafés mejor posicionados ahora mismo en ${country}`}
      helperText="Ranking inteligente ETIOVE: combina puntuación, volumen de votos y calidad general del café."
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
