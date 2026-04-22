import { useMemo } from 'react';
import { spreadByBrand } from '../utils/coffeeRanking';
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
    const sorted = [...(top100 || [])]
      .filter((item) => item?.coffeeCategory === 'daily')
      .sort((a, b) => Number(b?.rankingScore || 0) - Number(a?.rankingScore || 0));
    return spreadByBrand(sorted);
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top café diario"
      subtitle="Los cafés diarios mejor posicionados por la comunidad"
      helperText="Ranking para café de supermercado o consumo habitual, calculado en backend."
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
