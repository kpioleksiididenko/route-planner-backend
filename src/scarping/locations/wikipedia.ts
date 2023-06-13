import { LocationDto } from './location.dto';
import { LocationType } from '@prisma/client';

export const scarpWikipediaLocations = async () => {
  const lakes = await scarpLakes();
  const rivers = await scarpRiverLocations();
  const mountains = await scarpMountains();
  const mountainPasses = await scarpMountainPasses();
  const mountainRanges = await scarpMountainRanges();
  const settelments = await scarpSettelments();
  const allLocations = [
    ...lakes,
    ...rivers,
    ...mountains,
    ...mountainPasses,
    ...mountainRanges,
    ...settelments,
  ];
  return allLocations;
};

const BATCH_SIZE = 30;
const scarpCategory = async (
  categoryName: string,
  articleToLocation: (object) => Promise<LocationDto>,
): Promise<LocationDto[]> => {
  const articles = await getArticlesInCategory(categoryName);
  const articleBatches = splitIntoBatches(articles, BATCH_SIZE);
  const locations = [];
  console.log(`batch size: ${BATCH_SIZE}`);
  for (const [i, batch] of articleBatches.entries()) {
    console.log(`${i + 1}/${articleBatches.length} batches`);
    const newLocations = await Promise.all(
      batch.map(async article => await articleToLocation(article)),
    );
    locations.push(...newLocations);
  }
  return locations;
};

const splitIntoBatches = <T>(array: T[], batchSize: number): Array<T[]> => {
  const batches = [];
  let startIndex = 0;
  while (startIndex < array.length) {
    batches.push(array.slice(startIndex, startIndex + batchSize));
    startIndex += batchSize;
  }
  return batches;
};

const categoryMembersApiPath =
  'https://uk.wikipedia.org/w/api.php?' +
  'action=query' +
  '&format=json' +
  '&list=categorymembers' +
  '&cmlimit=500' + //CANT FETCH MORE THAN 500 ITEMS AT ONCE
  '&cmtitle=<title>';

const getArticlesInCategory = async (categoryName: string): Promise<any[]> => {
  console.log({ categoryName });
  //TODO maybe extract info from subcategories if they are useful
  const isCategory = article => article.title.startsWith('Категорія:');
  const clearCategoryName = categoryName
    .replace('Категорія:', '')
    .replaceAll('_', ' ');
  const isCategoryArticle = article => article.title === clearCategoryName;

  const url = categoryMembersApiPath.replace('<title>', categoryName);
  const articles = (await fetchJson(url)).query.categorymembers;
  return articles.filter(
    article => !isCategory(article) && !isCategoryArticle(article),
  );
};

const genArticleToLocation = (
  clearTitle: (string) => string,
  locationType: LocationType,
) => {
  const articleToLocation = async (article): Promise<LocationDto> => {
    const summary = await fetchArticleSummary(article.title);
    // TODO maybe try to pull out alternative titles and more detailed description
    const [latitude, longitude] = await fetctchArticleCoordinates(
      article.pageid,
    );
    return {
      name: clearTitle(summary.title),
      alternateNames: [],
      latitude,
      longitude,
      type: locationType,
      description: summary.extract,
    };
  };
  return articleToLocation;
};

const pageSummaryApiPath =
  'https://uk.wikipedia.org/api/rest_v1/page/summary/<pageTitle>';
const fetchArticleSummary = async (title: string) => {
  const url = pageSummaryApiPath.replace('<pageTitle>', title);
  return await fetchJson(url);
};

const coordinatesApiPath =
  'https://uk.wikipedia.org/w/api.php' +
  '?action=query' +
  '&format=json' +
  '&prop=coordinates&coprimary=all&pageids=<pageid>';
const fetctchArticleCoordinates = async (
  pageid: number,
): Promise<[number | undefined, number | undefined]> => {
  const url = coordinatesApiPath.replace('<pageid>', String(pageid));
  const response = await fetchJson(url);
  // TODO now includes first coordinates, maybe choose somehow
  const coordinates = response.query.pages[pageid].coordinates?.[0];
  return [coordinates?.lat, coordinates?.lon];
};

const fetchJson = async url => {
  const response = await fetch(url);
  return await response.json();
};

const carpathianMountains = 'Категорія:Вершини_Карпат';
const scarpMountains = async () => {
  const articleToLocation = genArticleToLocation(
    title => title.replace('(гора)', '').trim(),
    LocationType.Mountain,
  );
  return await scarpCategory(carpathianMountains, articleToLocation);
};

const carpathianMountainPasses = 'Категорія:Перевали_Українських_Карпат';
const scarpMountainPasses = async () => {
  const articleToLocation = genArticleToLocation(
    title => title.replace('(перевал)', '').trim(),
    LocationType.MountainPass,
  );
  return await scarpCategory(carpathianMountainPasses, articleToLocation);
};

const ukraninanMountainRanges = 'Категорія:Гірські_хребти_України';
const scarpMountainRanges = async () => {
  const articleToLocation = genArticleToLocation(
    title => title.replace('(хребет)', '').replace('хребет', '').trim(),
    LocationType.MountainRange,
  );
  return await scarpCategory(ukraninanMountainRanges, articleToLocation);
};

const settelmentsCategories = [
  'Категорія:Села_Івано-Франківської_області',
  'Категорія:Селища_міського_типу_Івано-Франківської_області',
  'Категорія:Міста_Івано-Франківської_області',

  'Категорія:Села_Львівської_області',
  'Категорія:Селища_міського_типу_Львівської_області',
  'Категорія:Міста_Львівської_області',

  'Категорія:Села_Закарпатської_області',
  'Категорія:Селища_міського_типу_Закарпатської_області',
  'Категорія:Міста_Закарпатської_області',

  'Категорія:Села_Чернівецької_області',
  'Категорія:Селища_міського_типу_Чернівецької_області',
  'Категорія:Міста_Чернівецької_області',
];
const scarpSettelments = async () => {
  const articleToLocation = genArticleToLocation(
    clearSettlementTitle,
    LocationType.Settlement,
  );
  const locations = [];
  for (const categoryName of settelmentsCategories) {
    locations.push(...(await scarpCategory(categoryName, articleToLocation)));
  }
  return locations;
};

const regionInParenthesisRegex = /\(\S+ район\)/;
const clearSettlementTitle = (title: string): string =>
  title
    .replace('(місто)', '')
    .replace('(смт)', '')
    .replace('(село)', '')
    .replace(regionInParenthesisRegex, '')
    .trim();

const lakeCategories = [
  'Категорія:Озера_Івано-Франківської_області',
  'Категорія:Озера_Львівської_області',
  'Категорія:Озера_Закарпатської_області',
  'Категорія:Озера_Чернівецької_області',
];
const scarpLakes = async () => {
  const articleToLocation = genArticleToLocation(
    title => title.replace('(озеро)', '').replace('озеро', '').trim(),
    LocationType.Lake,
  );
  const locations = [];
  for (const categoryName of lakeCategories) {
    locations.push(...(await scarpCategory(categoryName, articleToLocation)));
  }
  return locations;
};

// const frankivskRegionRivers =
//   'https://uk.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D1%96%D1%8F:%D0%A0%D1%96%D1%87%D0%BA%D0%B8_%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%BE%D1%97_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%96';
// const lvivRegionRivers =
//   'https://uk.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D1%96%D1%8F:%D0%A0%D1%96%D1%87%D0%BA%D0%B8_%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%BE%D1%97_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%96';
// const zakarpattiaRegionRivers =
//   'https://uk.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D1%96%D1%8F:%D0%A0%D1%96%D1%87%D0%BA%D0%B8_%D0%97%D0%B0%D0%BA%D0%B0%D1%80%D0%BF%D0%B0%D1%82%D1%81%D1%8C%D0%BA%D0%BE%D1%97_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%96';
// const chernivtsyRegionRivers =
//   'https://uk.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D1%96%D1%8F:%D0%A0%D1%96%D1%87%D0%BA%D0%B8_%D0%A7%D0%B5%D1%80%D0%BD%D1%96%D0%B2%D0%B5%D1%86%D1%8C%D0%BA%D0%BE%D1%97_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%96';
const riverCategories = [
  'Категорія:Річки_Івано-Франківської_області',
  'Категорія:Річки_Львівської_області',
  'Категорія:Річки_Закарпатської_області',
  'Категорія:Річки_Чернівецької_області',
];

const scarpRiverLocations = async () => {
  const articleToLocation = genArticleToLocation(
    clearRiverTitle,
    LocationType.Stream,
  );
  const locations = [];
  for (const categoryName of riverCategories) {
    locations.push(...(await scarpCategory(categoryName, articleToLocation)));
  }
  return locations;
};

const clearRiverTitle = (title: string): string =>
  title
    .replace('(річка)', '')
    .replace('(струмок)', '')
    .replace('(потік)', '')
    .trim();
