import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { LocationDto } from './location.dto';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';
import * as extractZip from 'extract-zip';
import * as path from 'node:path';
import { LocationType } from '@prisma/client';

const DOWNLOAD_DIR = './temp/locations';
const LOCATIONS_FILENAME = 'UA.txt';
const DATA_LINK = 'https://download.geonames.org/export/dump/UA.zip';

export async function scarpGeoNamesLocations(): Promise<LocationDto[]> {
  // TODO in production redownload every time
  if (!isDataDownloaded()) {
    await downloadGeonamesData(DOWNLOAD_DIR);
  }
  return parseGeonamesData(path.join(DOWNLOAD_DIR, LOCATIONS_FILENAME));
}

const isDataDownloaded = () =>
  fs.existsSync(path.join(DOWNLOAD_DIR, LOCATIONS_FILENAME));

async function downloadGeonamesData(downloadDir: string) {
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  const zipPath = path.join(downloadDir, 'UA.zip');
  const { body } = await fetch(DATA_LINK);
  const readStream = Readable.fromWeb(body as ReadableStream<any>);
  const writeStream = fs.createWriteStream(zipPath);
  await pipeline(readStream, writeStream);
  await extractZip(zipPath, {
    dir: path.resolve(downloadDir),
  });
}

type GeoNamesRecord = {
  geonameid: number; // integer id of record in geonames database
  name: string; // name of geographical point (utf8) varchar(200)
  asciiname: string; // name of geographical point in plain ascii characters, varchar(200)
  alternatenames: string[]; // alternatenames, comma separated, ascii names automatically transliterated, convenience attribute from alternatename table, varchar(10000)
  latitude: number; // latitude in decimal degrees (wgs84)
  longitude: number; // longitude in decimal degrees (wgs84)
  featureClass: string; // see http://www.geonames.org/export/codes.html, char(1)
  featureCode: string; // see http://www.geonames.org/export/codes.html, varchar(10)
  countryCode: string; // ISO-3166 2-letter country code, 2 characters
  cc2: string; // alternate country codes, comma separated, ISO-3166 2-letter country code, 200 characters
  admin1Code: string; // fipscode (subject to change to iso code), see exceptions below, see file admin1Codes.txt for display names of this code:string; varchar(20)
  admin2Code: string; // code for the second administrative division, a county in the US, see file admin2Codes.txt:string; varchar(80)
  admin3Code: string; // code for third level administrative division, varchar(20)
  admin4Code: string; // code for fourth level administrative division, varchar(20)
  population: number; // bigint (8 byte int)
  elevation: number; // in meters, integer
  dem: string; // digital elevation model, srtm3 or gtopo30, average elevation of 3''x3'' (ca 90mx90m) or 30''x30'' (ca 900mx900m) area in meters, integer. srtm processed by cgiar/ciat.
  timezone: string; // the iana timezone id (see file timeZone.txt) varchar(40)
  modificationDate: string; // date of last modification in yyyy-MM-dd format
};

async function parseGeonamesData(
  locationsFilePath: string,
): Promise<LocationDto[]> {
  const file = await fsp.open(locationsFilePath);
  const locations = [];
  for await (const row of file.readLines()) {
    const record = parseGeoNamesRow(row);
    if (!isInUaCarpathians(record)) {
      continue;
    }
    const location = geoNamesRecordToLocation(record);
    locations.push(location);
  }
  return locations;
}

// Transcarpathia, Ivano-Frankivsk, Lviv, Chernivtsi
const carpathianRegionsCodes = ['25', '06', '15', '03'];
const isInUaCarpathians = (record: GeoNamesRecord) =>
  record.countryCode === 'UA' &&
  carpathianRegionsCodes.includes(record.admin1Code);

// TODO implement choosing ukranian name as primary
function parseGeoNamesRow(row: string): GeoNamesRecord {
  const [
    geonameid,
    name,
    asciiname,
    alternatenames,
    latitude,
    longitude,
    featureClass,
    featureCode,
    countryCode,
    cc2,
    admin1Code,
    admin2Code,
    admin3Code,
    admin4Code,
    population,
    elevation,
    dem,
    timezone,
    modificationDate,
  ] = row.split(/\t/);
  return {
    geonameid: Number(geonameid),
    name,
    asciiname,
    alternatenames: alternatenames.split(','),
    latitude: Number(latitude),
    longitude: Number(longitude),
    featureClass,
    featureCode,
    countryCode,
    cc2,
    admin1Code,
    admin2Code,
    admin3Code,
    admin4Code,
    population: Number(population),
    elevation: Number(elevation),
    dem,
    timezone,
    modificationDate,
  };
}

function geoNamesRecordToLocation(record: GeoNamesRecord): LocationDto {
  return {
    name: record.name,
    alternateNames: record.alternatenames,
    latitude: record.latitude,
    longitude: record.longitude,
    elevation: record.elevation,
    type: getLocationType(record),
    difficulty: undefined,
  };
}

// TODO maybe add more Location types
// TODO mayke conversion better

const codeToLocationType = new Map([
  ['LK', LocationType.Lake],
  ['STM', LocationType.Stream], // STM - stream
  ['MTU', LocationType.Mountain],
  ['MT', LocationType.Mountain],
  ['MTS', LocationType.MountainRange],
  ['PASS', LocationType.MountainPass],
]);
const classToLocationType = new Map<string, LocationType | undefined>([
  ['P', LocationType.Settlement], // P - city, village, ...
  ['R', LocationType.ArtificialObject], // R - road, railroad
  ['S', LocationType.ArtificialObject], // S - spot, building, farm
  ['U', LocationType.NatureObject], // U - undersea
  ['T', LocationType.NatureObject], // T - mountain,hill,rock,...
  ['H', LocationType.WaterObject]
]);

function getLocationType(record: GeoNamesRecord): LocationType | undefined {
  const featureClass = record.featureClass;
  const code = record.featureCode;
  if (codeToLocationType.has(code)) {
    return codeToLocationType.get(code);
  }
  if (classToLocationType.has(featureClass)) {
    return classToLocationType.get(featureClass);
  }
  // classes that can get here left here (no excat classification for them):
  // A - country, state, region...
  // L - parks,area, ...
  // V - forest,heath,...
  return undefined;
}
