import { useMemo } from 'react';
import { normalizeCategory, sortByRankingScore } from '../utils/coffeeRanking';
import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function DailyTopTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  top100,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  const dailyItems = useMemo(() => {
    const filtered = (top100 || []).filter((item) => normalizeCategory(item) === 'daily');
    return sortByRankingScore(filtered);
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top café diario"
      subtitle="Los cafés diarios mejor valorados por la comunidad"
      helperText="Ranking pensado para café de supermercado o consumo habitual, dando peso a nota y confianza de votos."
      items={dailyItems}
      categoryLabel="Café diario"
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés diarios suficientes en esta vista."
      heroBadge="TOP DIARIO"
    />
  );
}
