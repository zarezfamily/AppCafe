import { normalize } from '../../core/utils';

export const filterCoffeeList = (list, query) => {
  if (!query?.trim()) return list;
  const normalizedQuery = normalize(query);

  return list
    .filter(
      (coffee) =>
        normalize(coffee.nombre).includes(normalizedQuery) ||
        normalize(coffee.pais).includes(normalizedQuery) ||
        normalize(coffee.region).includes(normalizedQuery) ||
        normalize(coffee.origen).includes(normalizedQuery) ||
        normalize(coffee.variedad).includes(normalizedQuery) ||
        normalize(coffee.proceso).includes(normalizedQuery) ||
        normalize(coffee.notas).includes(normalizedQuery)
    )
    .slice(0, 50);
};

export const selectTopCoffeesForCountry = (topCoffees, country) => {
  const filtered = topCoffees.filter(
    (coffee) => normalize(coffee.pais) === normalize(country || 'España')
  );
  return filtered.length > 0 ? filtered : topCoffees;
};
