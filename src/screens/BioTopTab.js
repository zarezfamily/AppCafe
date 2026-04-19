import { useMemo } from 'react';
import { isBioCoffee, sortByBioScore } from '../utils/coffeeRanking';
import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function BioTopTab({
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
  const bioItems = useMemo(() => {
    const filtered = (top100 || []).filter((item) => isBioCoffee(item));
    return sortByBioScore(filtered);
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Top cafés BIO"
      subtitle="Los cafés BIO y ecológicos mejor posicionados"
      helperText="Selección BIO basada en calidad, votos y relevancia dentro de ETIOVE."
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
