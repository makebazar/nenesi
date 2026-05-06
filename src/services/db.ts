export interface Tariff {
  id: number;
  tag: string;
  title: string;
  price: number;
  features: string[];
  isPopular: boolean;
}

const DEFAULT_TARIFFS: Tariff[] = [
  {
    id: 1,
    tag: "ЭКОНОМ",
    title: "Через день",
    price: 790,
    features: [
      "Вынос мусора каждые 2 дня",
      "Любой объем (до 60л)",
      "Протирка пола под пакетом",
      "Техподдержка 24/7",
    ],
    isPopular: false,
  },
  {
    id: 2,
    tag: "КОМФОРТ",
    title: "Каждый день",
    price: 990,
    features: [
      "Вынос мусора ежедневно",
      "Любой объем (до 60л)",
      "Протирка пола под пакетом",
      "Приостановка на время отпуска",
    ],
    isPopular: true,
  },
];

export const getTariffs = (): Tariff[] => {
  const data = localStorage.getItem("nenesi_tariffs");
  if (data) return JSON.parse(data);
  localStorage.setItem("nenesi_tariffs", JSON.stringify(DEFAULT_TARIFFS));
  return DEFAULT_TARIFFS;
};

export const saveTariffs = (tariffs: Tariff[]) => {
  localStorage.setItem("nenesi_tariffs", JSON.stringify(tariffs));
};
