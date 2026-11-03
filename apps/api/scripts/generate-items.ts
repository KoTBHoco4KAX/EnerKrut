import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ContainerType,
  ConditionProfileKey,
  ItemSource,
  Rarity,
} from "@enerkrut/shared";
import type { CaseId, ItemSeed } from "@enerkrut/shared";

interface BrandSpec {
  brand: string;
  name: string;
  country: string;
  container: ContainerType;
  source: ItemSource;
  flavors: readonly string[];
  baseTaste: number;
  yearBase: number;
  note: string;
  alcoholPercent?: number;
  archive?: boolean;
  discontinued?: boolean;
  fictional?: boolean;
}

interface CaseBlueprint {
  id: CaseId;
  prefix: string;
  priceFactor: number;
  conditionProfile: ConditionProfileKey;
  counts: Record<Rarity, number>;
  pools: Record<Rarity, readonly BrandSpec[]>;
  forceArchive?: boolean;
}

const RARITY_ORDER = [
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
  Rarity.FictionalMythic,
] as const;

const PRICE_RANGES: Record<Rarity, readonly [number, number]> = {
  [Rarity.Common]: [80, 240],
  [Rarity.Uncommon]: [240, 720],
  [Rarity.Rare]: [700, 2600],
  [Rarity.Epic]: [2400, 9000],
  [Rarity.Legendary]: [9000, 38000],
  [Rarity.FictionalMythic]: [60000, 400000],
};

const FLAVOR_NOTES: Record<string, string> = {
  Original: "классический энергетический профиль, карамельная база, цитрусовый финиш",
  Tropical: "манго, маракуйя и ананас, плотная сладость",
  Mango: "спелое манго, тропическая кислинка",
  Lime: "лаймовая цедра, сухой цитрусовый финиш",
  Cherry: "черечевая косточка, миндальная нота",
  Blueberry: "черника, ванильный оттенок",
  Watermelon: "арбузная мякоть, освежающая кислинка",
  Peach: "персик, абрикосовая косточка",
  Grape: "виноград изабелла, густая сладость",
  Pineapple: "ананас, лёгкая терпкость",
  Citrus: "апельсин, грейпфрут и лимонная корка",
  Raspberry: "малина, йогуртовая кислинка",
  Cola: "кола, ваниль и жжёный сахар",
  Mojito: "мята, лайм и тростниковый сахар",
  Lychee: "личи, белый цветок, прохладный финиш",
  Melon: "дыня, зелёная травянистость",
  Yuzu: "юдзу, грейпфрутовая горечь",
  Matcha: "матча, сливочный умами",
  Coffee: "жареный кофе, какао",
  Espresso: "двойной эспрессо, горький шоколад",
  Vanilla: "ваниль, сливочная карамель",
  Caramel: "солёная карамель, топлёное молоко",
  Coconut: "кокос, миндаль",
  Guava: "гуава, земляничная сладость",
  Passionfruit: "маракуйя, кислый тропический удар",
  Pomegranate: "гранат, tart-кислинка",
  Kiwi: "киви, зелёное яблоко",
  Strawberry: "земляника, сливочный мусс",
  "Salted Caramel": "солёная карамель, морская соль",
  Hazelnut: "лесной орех, пралине",
  Black: "чёрный кофе, тёмный шоколад",
  Latte: "латте, молочная пенка",
  Blackberry: "ежевика, пряная терпкость",
  Lemonade: "лимонад, сахарная корочка",
  CottonCandy: "сахарная вата, ваниль",
  "Cotton Candy": "сахарная вата, ваниль",
  "Rainbow Unicorn": "радужная карамель, мармелад",
  "Blue Razz": "голубая малина, кислотный акцент",
  "Cherry Blade": "вишнёвый леденец",
  "Lemon Drop": "лимонный щербет",
  "Peach Mango": "персик и манго",
  "Purple Guava": "фиолетовая гуава",
  "Sour Heads": "кислые конфеты, лимон",
  "Mean Bean": "кофе, ванильный крем",
  "Kona Blend": "кона, ореховая горечь",
  "Loca Moca": "мокко, какао",
  "Irish Blend": "ирландский крем, кофе",
  "Vanilla Light": "ваниль, лёгкий кофе",
  "Triple Shot": "тройной эспрессо",
  "Swiss Chocolate": "швейцарский шоколад",
  "Cold Brew": "холодный кофе, цитрус",
  Yellow: "лимон и имбирь",
  Green: "зелёное яблоко и киви",
  Blue: "голубая малина",
  Red: "вишня и гранат",
  Purple: "виноград и бузина",
  Sugarfree: "без сахара, сухой цитрус",
  Summer: "тропический микс",
  Punched: "фруктовый пунш",
  Recovery: "цитрус и травы",
  Revolt: "ягодный микс",
  "Super Sour": "кислый лимон",
  "Battery Original": "солод и цитрус",
  Storm: "цитрус и дыня",
  "Razzle Berry": "малина и ежевика",
  "Peach Fizz": "персик и газировка",
  "Melon Mania": "дыня",
  "Lemon HDZ": "лимон",
  "Orange Dreamsicle": "апельсин и сливки",
  "Cherry Limeade": "вишня и лайм",
  "White Gummy Bear": "белый мармелад",
  "Radical Skadattle": "тропические фрукты",
  Левзея: "левзея, горькие травы, армейская сухость",
  Элеутерококк: "элеутерококк, древесная горечь",
  Женьшень: "женьшень, землистый корень",
  Лимонник: "лимонник, кислая ягода",
  Родиола: "родиола, травяной настой",
  Клюква: "клюква, кислый морс",
  Лимон: "лимонная цедра",
  Вишня: "вишнёвый сок",
  "Чёрная смородина": "чёрная смородина",
  Манго: "манго",
  Лайм: "лайм",
  "Лесные ягоды": "лесные ягоды",
  Ume: "умэ, солёная слива",
  Нейо: "нейо, цитрус",
};

const PYATEROCHKA_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Flash",
    name: "Flash",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach", "Grape", "Pineapple", "Citrus", "Raspberry",
      "Cola", "Mojito", "Lychee",
    ],
    baseTaste: 6.4,
    yearBase: 1998,
    note: "газированный энергетик, сетевой массмаркет",
  },
  {
    brand: "Tornado Energy",
    name: "Tornado Energy",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Pineapple", "Citrus",
    ],
    baseTaste: 6.0,
    yearBase: 2001,
    note: "лёгкая газация, доступная цена",
  },
  {
    brand: "Drive",
    name: "Drive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach", "Grape", "Citrus",
    ],
    baseTaste: 6.2,
    yearBase: 2000,
    note: "плотная карамельная база",
  },
  {
    brand: "Adrenaline Rush",
    name: "Adrenaline Rush",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Mango", "Lime", "Cherry", "Blueberry", "Watermelon",
      "Peach", "Grape", "Pineapple", "Citrus", "Raspberry",
    ],
    baseTaste: 7.1,
    yearBase: 1999,
    note: "выраженный кофеиновый профиль",
  },
  {
    brand: "Burn",
    name: "Burn",
    country: "KZ",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach", "Grape", "Citrus",
    ],
    baseTaste: 7.0,
    yearBase: 2001,
    note: "гуарана и витаминный комплекс",
  },
  {
    brand: "Gorilla",
    name: "Gorilla",
    country: "BY",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Pineapple", "Citrus", "Raspberry",
    ],
    baseTaste: 6.7,
    yearBase: 2011,
    note: "сладкая база, таурин",
  },
  {
    brand: "E-ON",
    name: "E-ON",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach", "Grape", "Citrus",
    ],
    baseTaste: 6.3,
    yearBase: 2008,
    note: "энергетик с витаминами группы B",
  },
  {
    brand: "Volt",
    name: "Volt",
    country: "KZ",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Pineapple", "Citrus",
    ],
    baseTaste: 6.1,
    yearBase: 2012,
    note: "лёгкий цитрусовый профиль",
  },
];

const TABACHKA_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Monster Energy",
    name: "Monster Energy",
    country: "PL",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Lo-Carb", "Mango Loco", "Pipeline Punch", "Khaos",
      "Ultra White", "Ultra Violet", "Ultra Paradise", "Nitro", "Assault",
      "Ripper", "Mixxd", "Bad Apple", "Lewis Hamilton", "Rossi",
    ],
    baseTaste: 7.4,
    yearBase: 2002,
    note: "польский импорт, крупная банка",
  },
  {
    brand: "Burn",
    name: "Burn",
    country: "PL",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach", "Grape", "Citrus",
    ],
    baseTaste: 7.0,
    yearBase: 2001,
    note: "серая поставка, европейская рецептура",
  },
  {
    brand: "Tiger Energy",
    name: "Tiger Energy",
    country: "PL",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Citrus",
    ],
    baseTaste: 6.2,
    yearBase: 2003,
    note: "бюджетный польский энергетик",
  },
  {
    brand: "Jaguar 2007",
    name: "Jaguar 2007",
    country: "PL",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Citrus", "Guava",
    ],
    baseTaste: 6.8,
    yearBase: 2007,
    note: "ранняя польская партия, коллекционный интерес",
  },
  {
    brand: "Red Devil",
    name: "Red Devil",
    country: "PL",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Watermelon",
      "Peach", "Grape", "Citrus",
    ],
    baseTaste: 6.0,
    yearBase: 2004,
    note: "пряная карамель, серый импорт",
  },
  {
    brand: "Чёрный Русский",
    name: "Чёрный Русский",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Клюква", "Лимон", "Вишня", "Чёрная смородина"],
    baseTaste: 6.5,
    yearBase: 2005,
    note: "алкогольный энергетик, крепкая ягодная база",
    alcoholPercent: 7.5,
  },
  {
    brand: "Hooch",
    name: "Hooch",
    country: "RU",
    container: ContainerType.Bottle,
    source: ItemSource.Registry,
    flavors: ["Original", "Lemon", "Berry", "Tropical", "Citrus"],
    baseTaste: 6.2,
    yearBase: 2004,
    note: "алкогольный лимонад с энергетическим акцентом",
    alcoholPercent: 8.0,
  },
  {
    brand: "Strike",
    name: "Strike",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Манго", "Лайм", "Вишня", "Лесные ягоды"],
    baseTaste: 6.1,
    yearBase: 2008,
    note: "алкогольный энергетик, фруктовый профиль",
    alcoholPercent: 7.0,
  },
];

const TOKYO_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Zone",
    name: "Zone",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Citrus", "Grape", "Peach", "Lychee", "Melon", "Yuzu",
      "Ramune", "Pineapple", "Apple",
    ],
    baseTaste: 7.2,
    yearBase: 1999,
    note: "японская банка из автомата",
  },
  {
    brand: "Lipovitan D",
    name: "Lipovitan D",
    country: "JP",
    container: ContainerType.Bottle,
    source: ItemSource.OpenFoodFacts,
    flavors: ["Original", "Royal", "Shot", "Taurine", "Citrus", "Grape"],
    baseTaste: 6.8,
    yearBase: 1962,
    note: "исторический тоник с таурином",
  },
  {
    brand: "Real Gold",
    name: "Real Gold",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Citrus", "Grape", "Peach", "Lychee", "Melon", "Yuzu",
      "Pineapple",
    ],
    baseTaste: 7.0,
    yearBase: 1998,
    note: "золотая банка, цитрусовая база",
  },
  {
    brand: "Boss Coffee Taurine",
    name: "Boss Coffee Taurine",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Black", "Latte", "Espresso", "Vanilla", "Caramel", "Matcha",
      "Hazelnut",
    ],
    baseTaste: 7.5,
    yearBase: 1992,
    note: "баночный кофе с таурином",
  },
  {
    brand: "Georgia Energy",
    name: "Georgia Energy",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: ["Original", "Citrus", "Peach", "Lychee", "Melon", "Coffee"],
    baseTaste: 7.1,
    yearBase: 1994,
    note: "кофейно-энергетический микс",
  },
  {
    brand: "Suntory Energy",
    name: "Suntory Energy",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: ["Original", "Citrus", "Grape", "Yuzu", "Pineapple", "Matcha"],
    baseTaste: 7.3,
    yearBase: 2000,
    note: "чистый вкус, японская рецептура",
  },
  {
    brand: "Pokka Sapporo",
    name: "Pokka Sapporo",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: ["Original", "Citrus", "Peach", "Melon", "Yuzu", "Ramune"],
    baseTaste: 6.9,
    yearBase: 1997,
    note: "фруктовая банка из дзидоханбайки",
  },
  {
    brand: "Sho-Chu High",
    name: "Sho-Chu High",
    country: "JP",
    container: ContainerType.Bottle,
    source: ItemSource.Registry,
    flavors: ["Original", "Yuzu", "Ume", "Grape", "Citrus"],
    baseTaste: 7.4,
    yearBase: 2003,
    note: "легальный слабоалкогольный микс на сёчу",
    alcoholPercent: 12.0,
  },
];

const DUTY_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Monster Java",
    name: "Monster Java",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Mean Bean", "Kona Blend", "Loca Moca", "Salted Caramel",
      "Irish Blend", "Vanilla Light", "Espresso", "Hazelnut", "Cold Brew",
      "Triple Shot", "Mocha", "Swiss Chocolate",
    ],
    baseTaste: 8.0,
    yearBase: 2003,
    note: "кофейный энергетик, дьюти-фри мультипак",
  },
  {
    brand: "Red Bull",
    name: "Red Bull Editions",
    country: "AT",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Yellow", "Green", "Blue", "Peach", "Red", "Purple", "Coconut",
      "Watermelon", "Tropical", "Sugarfree", "Original", "Summer",
    ],
    baseTaste: 7.8,
    yearBase: 1987,
    note: "линейка изданий, аэропортовая витрина",
  },
  {
    brand: "Rockstar",
    name: "Rockstar",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Original", "Punched", "Recovery", "Revolt", "Super Sour",
      "Blackberry", "Cotton Candy", "Lemonade", "Guava", "Watermelon",
    ],
    baseTaste: 7.2,
    yearBase: 2001,
    note: "американская классика, крупный формат",
  },
  {
    brand: "Reign",
    name: "Reign",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Storm", "Razzle Berry", "Peach Fizz", "Melon Mania", "Lemon HDZ",
      "Orange Dreamsicle", "Cherry Limeade", "White Gummy Bear", "Mango",
      "Strawberry",
    ],
    baseTaste: 7.6,
    yearBase: 2018,
    note: "спортивная линейка, без сахара",
  },
  {
    brand: "Bang",
    name: "Bang",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.OpenFoodFacts,
    flavors: [
      "Rainbow Unicorn", "Cotton Candy", "Blue Razz", "Cherry Blade",
      "Lemon Drop", "Peach Mango", "Purple Guava", "Star Blast",
      "Radical Skadattle", "Sour Heads",
    ],
    baseTaste: 7.7,
    yearBase: 2017,
    note: "высокая дозировка кофеина, яркая линейка",
  },
];

const AVITO_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Молодец-7Х",
    name: "Молодец-7Х",
    country: "RU",
    container: ContainerType.Ration,
    source: ItemSource.Registry,
    flavors: ["Левзея", "Элеутерококк", "Женьшень", "Лимонник", "Родиола"],
    baseTaste: 6.0,
    yearBase: 1985,
    note: "советский армейский паёк, настойка на адаптогенах",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Flash",
    name: "Flash Archive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Blueberry",
      "Watermelon", "Peach",
    ],
    baseTaste: 6.4,
    yearBase: 1998,
    note: "снятая с производства партия",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Tornado Energy",
    name: "Tornado Archive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Cherry", "Watermelon", "Peach",
    ],
    baseTaste: 6.0,
    yearBase: 2001,
    note: "архивный дизайн банки",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Drive",
    name: "Drive Archive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Tropical", "Mango", "Lime", "Cherry"],
    baseTaste: 6.2,
    yearBase: 2000,
    note: "старый логотип, гаражное хранение",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Adrenaline Rush",
    name: "Adrenaline Rush Archive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Mango", "Lime", "Cherry", "Blueberry", "Watermelon",
    ],
    baseTaste: 7.1,
    yearBase: 1999,
    note: "ранний тираж, коллекционная сохранность",
    archive: true,
  },
  {
    brand: "Burn",
    name: "Burn Archive",
    country: "RU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Tropical", "Mango", "Lime", "Cherry"],
    baseTaste: 7.0,
    yearBase: 2001,
    note: "импортная партия прошлых лет",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Bullit",
    name: "Bullit",
    country: "NL",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Tropical", "Mango", "Lime", "Cherry", "Guava",
    ],
    baseTaste: 6.9,
    yearBase: 1997,
    note: "европейский архив, вздутие банки",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Gorilla",
    name: "Gorilla Archive",
    country: "BY",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Tropical", "Mango", "Watermelon", "Peach"],
    baseTaste: 6.7,
    yearBase: 2011,
    note: "закрытая линейка, складской остаток",
    archive: true,
    discontinued: true,
  },
  {
    brand: "Monster Energy",
    name: "Monster Archive",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Lo-Carb", "Assault", "Ripper", "Khaos", "Mixxd",
    ],
    baseTaste: 7.4,
    yearBase: 2002,
    note: "архивная американская банка",
    archive: true,
  },
  {
    brand: "Rockstar",
    name: "Rockstar Archive",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Punched", "Recovery", "Revolt"],
    baseTaste: 7.2,
    yearBase: 2001,
    note: "ранний тираж, потёртая этикетка",
    archive: true,
  },
  {
    brand: "Red Bull",
    name: "Red Bull Archive",
    country: "AT",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Sugarfree", "Yellow", "Green", "Blue"],
    baseTaste: 7.8,
    yearBase: 1987,
    note: "архивное издание, историческая банка",
    archive: true,
  },
];

const EBAY_REAL_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Red Bull",
    name: "Red Bull Collector",
    country: "AT",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Sugarfree", "Krating Daeng", "Gold Edition",
      "Silver Edition", "Winter Edition",
    ],
    baseTaste: 7.8,
    yearBase: 1987,
    note: "закрытый лот, подтверждённая дата выпуска",
    archive: true,
  },
  {
    brand: "Monster Energy",
    name: "Monster Collector",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: [
      "Original", "Lo-Carb", "Khaos", "Assault", "Ripper", "BFC",
      "Nitrous", "Import",
    ],
    baseTaste: 7.4,
    yearBase: 2002,
    note: "ранний американский тираж",
    archive: true,
  },
  {
    brand: "Rockstar",
    name: "Rockstar Collector",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Punched", "Recovery", "Guava", "Burn"],
    baseTaste: 7.2,
    yearBase: 2001,
    note: "архивный лот с аукциона",
    archive: true,
  },
  {
    brand: "Battery",
    name: "Battery Collector",
    country: "FI",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Cranberry", "Coffee", "Sugarfree"],
    baseTaste: 6.8,
    yearBase: 1997,
    note: "скандинавский раритет",
    archive: true,
  },
  {
    brand: "Bullit",
    name: "Bullit Collector",
    country: "NL",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Sugarfree", "Tropical"],
    baseTaste: 6.9,
    yearBase: 1997,
    note: "европейский архив, неоткрытая банка",
    archive: true,
  },
  {
    brand: "5-hour Energy",
    name: "5-hour Energy Collector",
    country: "US",
    container: ContainerType.Bottle,
    source: ItemSource.Registry,
    flavors: ["Original", "Extra", "Grape", "Berry"],
    baseTaste: 6.0,
    yearBase: 2003,
    note: "мини-шот, ранняя упаковка",
    archive: true,
  },
  {
    brand: "Lucozade Energy",
    name: "Lucozade Collector",
    country: "GB",
    container: ContainerType.Bottle,
    source: ItemSource.Registry,
    flavors: ["Original", "Orange", "Cherry", "Tropical"],
    baseTaste: 6.5,
    yearBase: 1983,
    note: "британская архивная бутылка",
    archive: true,
  },
  {
    brand: "V Energy",
    name: "V Collector",
    country: "AU",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Green", "Blue", "Sugarfree"],
    baseTaste: 6.7,
    yearBase: 1999,
    note: "австралийский коллекционный лот",
    archive: true,
  },
  {
    brand: "Lipovitan D",
    name: "Lipovitan Collector",
    country: "JP",
    container: ContainerType.Bottle,
    source: ItemSource.Registry,
    flavors: ["Original", "Royal", "Shot"],
    baseTaste: 6.8,
    yearBase: 1962,
    note: "историческая японская бутылка",
    archive: true,
  },
  {
    brand: "Shark Energy",
    name: "Shark Collector",
    country: "FR",
    container: ContainerType.Can,
    source: ItemSource.Registry,
    flavors: ["Original", "Tropical", "Citrus"],
    baseTaste: 6.3,
    yearBase: 1998,
    note: "французский архив, редкая серия",
    archive: true,
  },
];

const EBAY_FICTIONAL_BRANDS: readonly BrandSpec[] = [
  {
    brand: "Cheetah Chug",
    name: "Cheetah Chug",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Citrus", "Wild Berry", "Mango"],
    baseTaste: 8.9,
    yearBase: 1997,
    note: "пародийный энергетик из закрытого лота",
    fictional: true,
  },
  {
    brand: "Staminan X",
    name: "Staminan X",
    country: "JP",
    container: ContainerType.SlimCan,
    source: ItemSource.Manual,
    flavors: ["Original", "Royal", "EX", "Zero"],
    baseTaste: 9.1,
    yearBase: 1998,
    note: "вымышленный тоник, пародия на японскую классику",
    fictional: true,
  },
  {
    brand: "Overdose 90s",
    name: "Overdose 90s",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Red Line", "Blue Shock", "Citrus"],
    baseTaste: 8.7,
    yearBase: 1996,
    note: "пародийный реликт девяностых",
    fictional: true,
  },
  {
    brand: "C-Can",
    name: "C-Can",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Neo", "Type R", "Silver"],
    baseTaste: 9.0,
    yearBase: 1999,
    note: "вымышленная экспериментальная банка",
    fictional: true,
  },
  {
    brand: "Voltage Void",
    name: "Voltage Void",
    country: "DE",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Static", "Blackout", "Neon"],
    baseTaste: 8.8,
    yearBase: 2001,
    note: "пародийный немецкий энергетик",
    fictional: true,
  },
  {
    brand: "Taurine Titan",
    name: "Taurine Titan",
    country: "GB",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Gold", "Colossus", "Zero"],
    baseTaste: 8.6,
    yearBase: 2000,
    note: "вымышленный британский титан таурина",
    fictional: true,
  },
  {
    brand: "Nightshift 9000",
    name: "Nightshift 9000",
    country: "US",
    container: ContainerType.SlimCan,
    source: ItemSource.Manual,
    flavors: ["Original", "Midnight", "Espresso", "Ice"],
    baseTaste: 9.2,
    yearBase: 2003,
    note: "пародийный ночной энергетик",
    fictional: true,
  },
  {
    brand: "Mega Bull X",
    name: "Mega Bull X",
    country: "AT",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Red", "Blue", "Gold"],
    baseTaste: 8.5,
    yearBase: 1995,
    note: "вымышленный австрийский бык",
    fictional: true,
  },
  {
    brand: "Cyber Sip",
    name: "Cyber Sip",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Neon", "Chrome", "Yuzu"],
    baseTaste: 9.3,
    yearBase: 2004,
    note: "пародийный киберпанк-энергетик",
    fictional: true,
  },
  {
    brand: "Zero Gravity",
    name: "Zero Gravity",
    country: "US",
    container: ContainerType.SlimCan,
    source: ItemSource.Manual,
    flavors: ["Original", "Orbit", "Luna", "Comet"],
    baseTaste: 8.9,
    yearBase: 2006,
    note: "вымышленная невесомая серия",
    fictional: true,
  },
  {
    brand: "Static Rush",
    name: "Static Rush",
    country: "DE",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Volt", "Amp", "Pulse"],
    baseTaste: 8.7,
    yearBase: 1998,
    note: "пародийный статический разряд",
    fictional: true,
  },
  {
    brand: "Neon Fang",
    name: "Neon Fang",
    country: "JP",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Bite", "Venom", "Ice"],
    baseTaste: 9.0,
    yearBase: 2007,
    note: "вымышленный неоновый хищник",
    fictional: true,
  },
  {
    brand: "Proto Can",
    name: "Proto Can",
    country: "US",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Prototype", "Mark II", "Final"],
    baseTaste: 9.4,
    yearBase: 1994,
    note: "пародийный прототип энергетика",
    fictional: true,
  },
  {
    brand: "Ghost Batch",
    name: "Ghost Batch",
    country: "GB",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Phantom", "Spirit", "Frost"],
    baseTaste: 8.8,
    yearBase: 2002,
    note: "вымышленная призрачная партия",
    fictional: true,
  },
  {
    brand: "Hyper Rooster",
    name: "Hyper Rooster",
    country: "FR",
    container: ContainerType.Can,
    source: ItemSource.Manual,
    flavors: ["Original", "Fire", "Sunrise", "Zero"],
    baseTaste: 8.6,
    yearBase: 2000,
    note: "пародийный французский петух",
    fictional: true,
  },
];

function allRarities(specs: readonly BrandSpec[]): Record<Rarity, readonly BrandSpec[]> {
  return {
    [Rarity.Common]: specs,
    [Rarity.Uncommon]: specs,
    [Rarity.Rare]: specs,
    [Rarity.Epic]: specs,
    [Rarity.Legendary]: specs,
    [Rarity.FictionalMythic]: specs,
  };
}

const BLUEPRINTS: readonly CaseBlueprint[] = [
  {
    id: "pyaterochka_fridge",
    prefix: "py",
    priceFactor: 0.8,
    conditionProfile: ConditionProfileKey.Massmarket,
    counts: {
      [Rarity.Common]: 40,
      [Rarity.Uncommon]: 20,
      [Rarity.Rare]: 12,
      [Rarity.Epic]: 4,
      [Rarity.Legendary]: 2,
      [Rarity.FictionalMythic]: 1,
    },
    pools: allRarities(PYATEROCHKA_BRANDS),
  },
  {
    id: "tabachka_ip",
    prefix: "tb",
    priceFactor: 1.0,
    conditionProfile: ConditionProfileKey.Massmarket,
    counts: {
      [Rarity.Common]: 25,
      [Rarity.Uncommon]: 25,
      [Rarity.Rare]: 20,
      [Rarity.Epic]: 8,
      [Rarity.Legendary]: 3,
      [Rarity.FictionalMythic]: 1,
    },
    pools: allRarities(TABACHKA_BRANDS),
  },
  {
    id: "tokyo_jidohanbai",
    prefix: "tj",
    priceFactor: 1.25,
    conditionProfile: ConditionProfileKey.PremiumImport,
    counts: {
      [Rarity.Common]: 15,
      [Rarity.Uncommon]: 25,
      [Rarity.Rare]: 25,
      [Rarity.Epic]: 10,
      [Rarity.Legendary]: 4,
      [Rarity.FictionalMythic]: 2,
    },
    pools: allRarities(TOKYO_BRANDS),
  },
  {
    id: "duty_free_airport",
    prefix: "df",
    priceFactor: 1.6,
    conditionProfile: ConditionProfileKey.PremiumImport,
    counts: {
      [Rarity.Common]: 5,
      [Rarity.Uncommon]: 20,
      [Rarity.Rare]: 30,
      [Rarity.Epic]: 20,
      [Rarity.Legendary]: 8,
      [Rarity.FictionalMythic]: 3,
    },
    pools: allRarities(DUTY_BRANDS),
  },
  {
    id: "avito_garage_clean",
    prefix: "ag",
    priceFactor: 2.0,
    conditionProfile: ConditionProfileKey.ArchiveRare,
    counts: {
      [Rarity.Common]: 3,
      [Rarity.Uncommon]: 15,
      [Rarity.Rare]: 30,
      [Rarity.Epic]: 30,
      [Rarity.Legendary]: 20,
      [Rarity.FictionalMythic]: 5,
    },
    pools: allRarities(AVITO_BRANDS),
    forceArchive: true,
  },
  {
    id: "ebay_private_auction",
    prefix: "eb",
    priceFactor: 2.4,
    conditionProfile: ConditionProfileKey.ArchiveRare,
    counts: {
      [Rarity.Common]: 0,
      [Rarity.Uncommon]: 0,
      [Rarity.Rare]: 0,
      [Rarity.Epic]: 25,
      [Rarity.Legendary]: 30,
      [Rarity.FictionalMythic]: 15,
    },
    pools: {
      [Rarity.Common]: [],
      [Rarity.Uncommon]: [],
      [Rarity.Rare]: EBAY_REAL_BRANDS,
      [Rarity.Epic]: EBAY_REAL_BRANDS,
      [Rarity.Legendary]: EBAY_REAL_BRANDS,
      [Rarity.FictionalMythic]: EBAY_FICTIONAL_BRANDS,
    },
    forceArchive: true,
  },
];

const TRANSLITERATION: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(value: string): string {
  const transliterated = Array.from(value.toLowerCase())
    .map((character) => TRANSLITERATION[character] ?? character)
    .join("");
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (slug.length < 2) {
    throw new Error(`Cannot build slug from value: ${value}`);
  }
  return slug.slice(0, 40);
}

function pick<T>(values: readonly T[], index: number): T {
  if (values.length === 0) {
    throw new Error("Cannot pick from an empty collection");
  }
  const value = values[index % values.length];
  if (value === undefined) {
    throw new Error("Collection index resolved to undefined");
  }
  return value;
}

function flavorNotes(flavor: string, brandNote: string): string {
  const note = FLAVOR_NOTES[flavor] ?? `${flavor.toLowerCase()}, сбалансированная газация`;
  return `${note}; ${brandNote}`;
}

function buildItems(): ItemSeed[] {
  const items: ItemSeed[] = [];
  const usedIds = new Set<string>();
  const brandUsage = new Map<string, number>();

  for (const blueprint of BLUEPRINTS) {
    for (const rarity of RARITY_ORDER) {
      const count = blueprint.counts[rarity];
      const pool = blueprint.pools[rarity];
      for (let index = 0; index < count; index += 1) {
        const brand = pick(pool, index);
        const usageKey = `${blueprint.id}:${brand.name}`;
        const usage = brandUsage.get(usageKey) ?? 0;
        brandUsage.set(usageKey, usage + 1);
        const flavor = pick(brand.flavors, usage);
        const cohort = Math.floor(usage / brand.flavors.length);
        const year = Math.min(2030, brand.yearBase + cohort * 3 + (usage % 3));
        const isFictional = brand.fictional === true;
        const conditionProfile = isFictional
          ? ConditionProfileKey.Fictional
          : blueprint.conditionProfile;
        const isArchiveRare =
          !isFictional && (brand.archive === true || blueprint.forceArchive === true);
        const isDiscontinued = !isFictional && brand.discontinued === true;
        const isAlcoholic = brand.alcoholPercent !== undefined;
        const alcoholPercent = isAlcoholic
          ? Math.min(
              20,
              Math.round(((brand.alcoholPercent ?? 0) + (usage % 3) * 0.5) * 10) / 10,
            )
          : undefined;
        const priceRange = PRICE_RANGES[rarity];
        const priceSpan = priceRange[1] - priceRange[0] + 1;
        const basePriceRub = Math.max(
          1,
          Math.round(
            (priceRange[0] +
              ((index * 137 + usage * 53 + RARITY_ORDER.indexOf(rarity) * 97) % priceSpan)) *
              blueprint.priceFactor,
          ),
        );
        const tasteTenths = Math.min(
          100,
          Math.max(
            0,
            Math.round(brand.baseTaste * 10) + (((index * 7 + usage * 3) % 9) - 4),
          ),
        );
        const tasteScore = Number((tasteTenths / 10).toFixed(1));
        const brandSlug = slugify(brand.name);
        const flavorSlug = slugify(flavor);
        const baseId = `${blueprint.prefix}_${brandSlug}_${flavorSlug}_${year}`;
        let id = baseId.slice(0, 64);
        let suffix = 2;
        while (usedIds.has(id)) {
          const suffixText = `_${suffix}`;
          id = `${baseId.slice(0, 64 - suffixText.length)}${suffixText}`;
          suffix += 1;
        }
        usedIds.add(id);
        const displayName = `${brand.name} ${flavor} ${year}`;
        items.push({
          id,
          displayName,
          brand: brand.brand,
          countryOrigin: brand.country,
          containerType: brand.container,
          rarity,
          conditionProfile,
          basePriceRub,
          tasteScore,
          flavorNotes: flavorNotes(flavor, brand.note),
          yearRelease: year,
          isAlcoholic,
          ...(alcoholPercent === undefined ? {} : { alcoholPercent }),
          isFictional,
          isDiscontinued,
          isArchiveRare,
          imageUrl: `/cdn/items/${id}.webp`,
          imageThumbUrl: `/cdn/items/${id}_thumb.webp`,
          source: isFictional ? ItemSource.Manual : brand.source,
          legalFlags: {
            parody: isFictional,
            alcohol: isAlcoholic,
            narco_list_ref: false,
          },
          caseId: blueprint.id,
          weightInRarity: 1 + ((index * 17 + usage * 11) % 100),
        });
      }
    }
  }

  return items;
}

async function main(): Promise<void> {
  const items = buildItems();
  const target = fileURLToPath(new URL("../../../data/items.seed.json", import.meta.url));
  await writeFile(target, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = `${item.caseId}:${item.rarity}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const summary = Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
  process.stdout.write(`Generated ${items.length} items: ${summary}\n`);
}

await main();
