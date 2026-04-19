import { useMemo } from 'react';
import { sortByValueScore } from '../utils/coffeeRanking';
import SimpleCoffeeListTab from './SimpleCoffeeListTab';

export default function BestValueTab({
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
  const valueItems = useMemo(() => {
    const filtered = (top100 || []).filter((item) => Number(item?.precio || 0) > 0);
    return sortByValueScore(filtered);
  }, [top100]);

  return (
    <SimpleCoffeeListTab
      s={s}
      setActiveTab={setActiveTab}
      premiumAccent={premiumAccent}
      cargando={cargando}
      title="Mejor calidad/precio"
      subtitle="Los cafés con mejor equilibrio entre nota, votos y precio"
      helperText="Ideal para encontrar cafés muy aprovechables sin gastar de más."
      items={valueItems}
      categoryLabel="Value"
      CardVertical={CardVertical}
      setCafeDetalle={setCafeDetalle}
      favs={favs}
      toggleFav={toggleFav}
      emptyText="Aún no hay cafés con precio suficiente para esta vista."
      heroBadge="TOP VALUE"
    />
  );
}
