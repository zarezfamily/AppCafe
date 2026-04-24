import { useMemo } from 'react';
import { getBioScore, isBioCoffee, spreadByBrand } from '../utils/coffeeRanking';
import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function BioTopTab({
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
  const bioItems = useMemo(() => {
    const source = allCafes?.length ? allCafes : top100 || [];
    const sorted = [...source]
      .filter((item) => isBioCoffee(item))
      .sort((a, b) => {
        const diff = Number(b?.bioScore || 0) - Number(a?.bioScore || 0);
        return diff !== 0 ? diff : getBioScore(b) - getBioScore(a);
      })
      .slice(0, 50);
    return spreadByBrand(sorted);
  }, [allCafes, top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top cafés BIO"
      subtitle="Los cafés BIO y ecológicos mejor posicionados"
      helperText="Selección BIO basada en score persistido en backend para mantener consistencia."
      items={bioItems}
      categoryLabel="BIO"
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés BIO suficientes en esta vista."
      heroBadge="TOP BIO"
    />
  );
}
