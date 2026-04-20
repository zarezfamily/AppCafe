import { useMemo } from 'react';
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
    return [...(top100 || [])]
      .filter((item) => item?.isBio === true)
      .sort((a, b) => Number(b?.bioScore || 0) - Number(a?.bioScore || 0));
  }, [top100]);

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
