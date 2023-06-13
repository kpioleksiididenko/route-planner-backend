import { LocationType } from '@prisma/client';
import { LocationDto } from './location.dto';
import { getPageDocument } from '../util';

const SITE_URL = 'https://vpohid.com.ua';

export async function scarpVpohidLocations(): Promise<LocationDto[]> {
  const links = await scarpLocationLinks();
  console.log('parsed vphoid links');
  const locations = await scarpLocations(links);
  console.log('scarped vpohid locations');
  return locations;
}

//TODO check for not existing, add description if doesn't have one
// think about multiple descriptions in future
// think about name collision Петро та Петрос
async function scarpLocationLinks() {
  const catalogUrl = SITE_URL + '/browse/?start=<startItemNumber>&limit=100';
  const links = [];

  for (let startItemNumber = 0; ; startItemNumber += 100) {
    console.log(startItemNumber);
    const url = catalogUrl.replace(
      '<startItemNumber>',
      startItemNumber.toString(),
    );
    const doc = await getPageDocument(url);
    const newLinks = parseLocationLinks(doc);
    links.push(...newLinks);
    if (newLinks.length === 0) {
      break;
    }
  }
  return links;
}

function parseLocationLinks(catalogPage: Document): string[] {
  const links = catalogPage.querySelectorAll(
    '#fullist .browselistitem .row:first-of-type > div > a',
  );
  return Array.from(links).map(e => SITE_URL + e.getAttribute('href'));
}

async function scarpLocations(urls: string[]): Promise<LocationDto[]> {
  urls = [...urls];
  let locations = [];
  while (urls.length !== 0) {
    console.log('pasring vpohid link batch (100 links)');
    const urlsBatch = urls.splice(0, 100);
    const newLocations = await Promise.all(
      urlsBatch.map(async url => {
        const doc = await getPageDocument(url);
        return parseLocation(doc);
      }),
    );
    locations = locations.concat(newLocations);
  }
  return locations;
}

function parseLocation(locationPage: Document): LocationDto {
  const [name, type] = parseNameAndLocationType(locationPage);
  const [latitude, longitude] = parseCoordinates(locationPage);
  return {
    name,
    type,
    latitude,
    longitude,
    description: parseDescription(locationPage),
    alternateNames: [],
  };
}

// TODO maybe parse types better
const nameToLocationType = new Map([
  ['Вершина гори', LocationType.Mountain],
  ['Полонина', LocationType.Polonyna],
  // TODO think if it should be another type
  ['Орієнтир/Вказівник', LocationType.ArtificialObject],
  [' Джерело/Криниця', LocationType.DrinkingWaterSource],
  ['Туристична Будівля', LocationType.ArtificialObject],
  ['Рятувальники/Служби', LocationType.ArtificialObject],
]);

const waterObjectNameToType: [string, LocationType][] = [
  ['озеро', LocationType.Lake],

  ['ріка', LocationType.Stream],
  ['річка', LocationType.Stream],
  ['річечька', LocationType.Stream],
  ['струмок', LocationType.Stream],

  ['гук', LocationType.Waterfall],
  ['вдсп.', LocationType.Waterfall],
  ['водопад', LocationType.Waterfall],
  ['водоспад', LocationType.Waterfall],
];

function parseNameAndLocationType(
  locationPage: Document,
): [string, LocationType] {
  const name = locationPage.querySelector('h2').textContent;
  const locationTypeText = locationPage.querySelector(
    '.col-xs-5.text-right',
  ).textContent;

  // Цікаве місце
  // Місце для привалу
  // Небезпечне місце
  // this places get undefined
  if (locationTypeText !== "Водний об'єкт") {
    return [name, nameToLocationType.get(locationTypeText)];
  }

  for (const [typeName, type] of waterObjectNameToType) {
    if (name.toLowerCase().includes(typeName)) {
      return [name.replace(new RegExp(typeName, 'i'), ''), type];
    }
  }
  return [name, LocationType.WaterObject];
}

function parseCoordinates(locationPage: Document): [number, number] {
  const links = Array.from(locationPage.querySelectorAll('a'));
  const mapUrl = links.find(
    a => a.textContent === 'Показати на загальній карті',
  ).href;
  // url looks like this: /map/?mclat=48.16047082&mclng=24.50008830&mz=16&
  const urlParts = mapUrl.split(/[=&]/);

  const latitude = Number(urlParts[1]);
  const longitude = Number(urlParts[3]);
  return [latitude, longitude];
}

function parseDescription(locationPage: Document): string {
  return locationPage.querySelector('.objectdescription').textContent.trim();
}
