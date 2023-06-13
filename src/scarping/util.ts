import { Location } from '@prisma/client';
import { LocationDto } from './locations/location.dto';
import * as jsdom from 'jsdom';
import * as fsp from 'fs/promises';

export const minBy = <T>(array: Array<T>, f: (t: T) => number): T => {
  if (array.length === 0) {
    throw new Error("Can't get min of empty array");
  }
  let minElement = array[0];
  let minVal = f(minElement);
  for (const element of array) {
    const value = f(element);
    if (value < minVal) {
      minElement = element;
      minVal = value;
    }
  }
  return minElement;
};
const degreeToRadian = degree => (degree * Math.PI) / 180;

// https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
// returns km
export const distance = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number => {
  const earthRadiusKm = 6371;

  const lattitudeD = degreeToRadian(latitude1 - latitude2);
  const longitudeD = degreeToRadian(longitude1 - longitude2);

  latitude1 = degreeToRadian(latitude1);
  latitude2 = degreeToRadian(latitude2);

  const a =
    Math.sin(lattitudeD / 2) * Math.sin(lattitudeD / 2) +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeD / 2) *
      Math.sin(longitudeD / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return c * earthRadiusKm;
};

export const hasCoordinates = (l: Location | LocationDto) =>
  l.latitude !== null && l.longitude !== null;

export const getPageDocument = async (url: string): Promise<Document> => {
  const pageText = await (await fetch(url)).text();
  return new jsdom.JSDOM(pageText).window.document;
};

export const downloadPage = async (url: string, filePath: string) => {
  const pageText = await (await fetch(url)).text();
  await fsp.writeFile(filePath, pageText);
};

export const urlToFilename = (url: string) => url.replaceAll('/', '.');
