import { useMemo } from 'react';
import { getValueScore, spreadByBrand } from '../utils/coffeeRanking';
import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function BestValueTab({
  s,
  setActiveTab,
  premiumAccent,
  cargando,
  top100,
  allCafes,
  CardVertical,
  setCafeDetalle,
  favs,
  toggleFav,
}) {
  const valueItems = useMemo(() => {
    const source = allCafes?.length ? allCafes : top100 || [];
    const sorted = [...source]
      // Solo cafés con precio válido
      .filter((item) => Number(item?.precio || 0) > 0)
      // Orden principal por valueScore (backend), fallback a cálculo local
      .sort((a, b) => {
        const aScore = Number(a?.valueScore || 0) || getValueScore(a);
        const bScore = Number(b?.valueScore || 0) || getValueScore(b);
        const valueDiff = bScore - aScore;

        if (valueDiff !== 0) return valueDiff;

        // fallback: mejor puntuación
        const ratingDiff = Number(b?.puntuacion || 0) - Number(a?.puntuacion || 0);

        if (ratingDiff !== 0) return ratingDiff;

        // fallback final: más votos
        return Number(b?.votos || 0) - Number(a?.votos || 0);
      })
      // Limitar a TOP 50 para performance y calidad visual
      .slice(0, 50);
    return spreadByBrand(sorted);
  }, [allCafes, top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Mejor calidad/precio"
      subtitle="Los cafés con mejor equilibrio entre precio y valoración"
      helperText="Ranking PRO basado en score backend + validación por votos para evitar falsos TOP."
      items={valueItems}
      categoryLabel="Value"
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés con precio suficiente para esta vista."
      heroBadge="BEST VALUE PRO"
    />
  );
}
