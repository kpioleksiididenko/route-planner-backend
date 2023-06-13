import * as fs from 'fs';
import {
  LocationDifficulty,
  LocationType,
  Season,
  TripDifficulty,
  TripType,
} from '@prisma/client';
import { LocationDto, ReportDto, RouteStopDto } from './dto';
import { downloadPage, getPageDocument, urlToFilename } from '../util';

// TODO check if I should use URL class
const GLOBUS_URL = 'https://www.tkg.org.ua';
const DOWNLOAD_DIR = './temp/reports/globus';
const URLS_PATH = `${DOWNLOAD_DIR}/reportUrls.json`;

export async function scarpGlobusReports(): Promise<ReportDto[]> {
  //TODO redownload every time in prod
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    const urls = await getReportUrls();
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    saveReportUrlList(URLS_PATH, urls);
    await downloadReportPages(DOWNLOAD_DIR, urls);
  }
  const urls = loadReportsUrlList(URLS_PATH);
  return await parseReports(urls, DOWNLOAD_DIR);
}

async function getReportUrls(): Promise<string[]> {
  // link to technical reports in carpathians and in ukraine
  const reportPage =
    GLOBUS_URL +
    '/trip_search?taxonomy_vocabulary_14_tid=105&taxonomy_vocabulary_5_tid=26' +
    '&page=<page_number>';

  let pageNumber = 0;
  let links = [];
  while (true) {
    const url = reportPage.replace('<page_number>', pageNumber.toString());
    const doc = await getPageDocument(url);
    const linksOnThisPage = Array.from(
      doc.querySelectorAll('td.views-field-title a'),
    ).map(el => `${GLOBUS_URL}${el.getAttribute('href')}`);
    links = links.concat(linksOnThisPage);
    pageNumber++;
    if (linksOnThisPage.length == 0) {
      break;
    }
  }
  return links;
}

function saveReportUrlList(filePath: string, urls: string[]) {
  fs.writeFileSync(filePath, JSON.stringify(urls));
}

function loadReportsUrlList(path: string): string[] {
  return JSON.parse(fs.readFileSync(path).toString());
}

async function downloadReportPages(directory: string, urls: string[]) {
  for (const url of urls) {
    const filePath = `${directory}/${urlToFilename(url)}`;
    await downloadPage(url, filePath);
  }
}

async function parseReports(
  urls: string[],
  savePath: string,
): Promise<ReportDto[]> {
  const reports = [];
  for (const url of urls) {
    const pagePath = `${savePath}/${urlToFilename(url)}`;
    const reportPage = await getPageDocument(pagePath);
    // TODO parse reports without pdf too
    if (!hasAttachedPdf(reportPage)) {
      console.log(`No pdf on ${url}`);
      continue;
    }
    reports.push(parseReport(reportPage, url));
  }
  return reports;
}

const hasAttachedPdf = (doc: Document) => parseReportFileUrl(doc) !== undefined;

function parseReport(reportPage: Document, url: string): ReportDto {
  return {
    title: parseReportTitle(reportPage),
    authorName: parseAuthorName(reportPage),
    tripType: parseTripType(reportPage),
    difficulty: parseTripDifficulty(reportPage),
    season: parseTripSeason(reportPage),
    year: parseTripYear(reportPage),
    stops: parseRouteStops(reportPage),
    fileUrl: parseReportFileUrl(reportPage),
    url: url,
  };
}

function parseReportTitle(reportPage: Document) {
  return reportPage.querySelector('#page-title').textContent;
}

function parseAuthorName(reportPage: Document) {
  return reportPage
    .querySelector('.field-name-taxonomy-vocabulary-1')
    .textContent.trim();
}

function parseReportFileUrl(reportPage: Document) {
  const links = Array.from(reportPage.querySelectorAll('a[href]'));
  const pdfLink = links.find(a => a.getAttribute('href').endsWith('.pdf'));
  return pdfLink?.getAttribute('href');
}

function parseTripType(reportPage: Document) {
  const nameToTripType = {
    Велотуризм: TripType.Cycling,
    'Гірський туризм': TripType.Mountaineering,
    'Лижний туризм': TripType.Ski,
    'Пішохідний туризм': TripType.Hiking,
  };
  const tripType = reportPage.querySelector(
    '.field-name-taxonomy-vocabulary-7',
  ).textContent;
  return nameToTripType[tripType];
}

function parseTripDifficulty(reportPage: Document) {
  const difficulty = reportPage
    .querySelector('.field-name-taxonomy-vocabulary-16')
    ?.textContent.trim();
  const nameToDifficulty = {
    'н/к': TripDifficulty.NonKatecorigal,
    '1 к.с.': TripDifficulty.First,
    '2 к.с.': TripDifficulty.Second,
    '3 к.с.': TripDifficulty.Third,
    '4 к.с.': TripDifficulty.Fourth,
    '5 к.с.': TripDifficulty.Fifth,
    '6 к.с.': TripDifficulty.Sixth,
  };
  return nameToDifficulty[difficulty];
}

function parseTripYear(reportPage: Document) {
  const year = Number(
    reportPage.querySelector('.field-name-taxonomy-vocabulary-15').textContent,
  );
  return new Date(year, 1);
}

function parseTripSeason(reportPage: Document) {
  const nameToSeason = {
    Літо: Season.Summer,
    Осінь: Season.Autumn,
    Зима: Season.Winter,
    Весна: Season.Spring,
  };
  const season = reportPage.querySelector(
    '.field-name-taxonomy-vocabulary-17',
  ).textContent;
  return nameToSeason[season];
}

const multipleSpaces = /\s+/g;
// # regex matches a- b, a -b, but not a-b to not split hyphen words
const hyphenBetweenLocations = /(?<!\s)- | -(?!\s)| - /g;
function parseRouteStops(reportPage: Document): RouteStopDto[] {
  // TODO add element selection by '-' in content
  const route = reportPage.querySelector(
    'article span.route, article p.note, article p.route',
  ).textContent;
  // TODO proper error
  if (!route) {
    throw 'No route on route page';
  }
  const stopNames = route
    // to represent same looking chars as same unicode chars
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
    .normalize('NFKD')
    .replace(/–/g, '-')
    .replace(multipleSpaces, ' ')
    .split(hyphenBetweenLocations);
  return stopNames.map((name, i) => {
    return {
      name,
      number: i,
      location: parseLocation(name),
    };
  });
}

// TODO think if any route stop needs linked location; maybe remove height location type
// order is important
const abbreviationToLocationType = new Map<string, LocationType>([
  ['смт.', LocationType.Settlement], //село
  ['вис.', LocationType.Height], //висота
  ['выс.', LocationType.Height], //висота
  ['д.р.', LocationType.Walley], //долина ріки
  ['дол. р.', LocationType.Walley], //долина ріки
  ['долина р.', LocationType.Walley], //долина ріки
  ['пер.', LocationType.MountainPass], //перевал
  ['п.', LocationType.MountainPass], //перевал
  ['г.', LocationType.Mountain], // гора
  ['ур.', LocationType.NatureObject], //урочище
  ['хр.', LocationType.MountainRange], //хребет
  ['р.', LocationType.Stream], //ріка
  ['пос.', LocationType.Settlement], //поселок
  ['с.', LocationType.Settlement], //село
  ['пол.', LocationType.Polonyna], //полонина
  ['дол.', LocationType.Walley], //долина
  ['оз.', LocationType.Lake], //озеро
  ['о.', LocationType.Lake], //озеро
  ['в.', LocationType.Mountain], //гора
  ['м.', LocationType.Settlement], //місто
]);
const difficulty = '(?<difficulty>[1-3][АБ][*]?|н/к)';
const elevation = '(?<elevation>[0-9]+[,.]?[0-9]+)\\s*(метрів|м.|м)?( н.р.м)?';
const r1 = `\\(${elevation},\\s*${difficulty}\\)`;
const r2 = `\\(${difficulty}\\)`;
const r3 = `\(${elevation}\)`;
const r4 = ` ${difficulty}`;
const r5 = ` ${elevation}`;
// order is important
const difficultyElevationRegexList = [r1, r2, r3, r4, r5];

function parseLocation(location: string): LocationDto {
  location = location.trim();
  let difficulty = undefined;
  let elevation = undefined;
  for (const regex of difficultyElevationRegexList) {
    const match = location.match(regex);
    if (match) {
      if (match?.groups?.difficulty !== undefined) {
        difficulty = difficultyFromString(match.groups.difficulty);
      }
      if (match?.groups?.elevation !== undefined) {
        elevation = Number(match.groups.elevation);
      }
      location = location.replace(new RegExp(regex), '').trim();
      break;
    }
  }

  let locationType = undefined;
  for (const [abbreviation, type] of abbreviationToLocationType.entries()) {
    if (location.includes(abbreviation)) {
      location = location.replace(abbreviation, '').trim();
      locationType = type;
      break;
    }
  }

  // some locations may have junk left
  const name = location
    .replace('рад.', '') // рад. - радіально
    .replace('(рад)', '')
    .replaceAll(/[\(\)\[\]]/g, '') // leftover brackets
    .replace('траверс', '')
    .trim();

  return { name, difficulty, elevation: elevation, type: locationType };
}

const difficultyFromString = (str: string) => {
  const strToDifficulty = {
    'н/к': LocationDifficulty.NonCategorized,
    '1А': LocationDifficulty.First_A,
    '1А*': LocationDifficulty.First_A_star,
    '1Б': LocationDifficulty.First_B,
    '1Б*': LocationDifficulty.First_B_star,
    '2А': LocationDifficulty.Second_A,
    '2А*': LocationDifficulty.Second_A_star,
    '2Б': LocationDifficulty.Second_B,
    '2Б*': LocationDifficulty.Second_B_star,
    '3А': LocationDifficulty.Third_A,
    '3А*': LocationDifficulty.Third_A_star,
    '3Б': LocationDifficulty.Third_B,
    '3Б*': LocationDifficulty.Third_B_star,
  };
  return strToDifficulty[str];
};
