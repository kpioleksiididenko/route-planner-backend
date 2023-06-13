import { scarpGeoNamesLocations } from './geonames';

// TODO remove code duplication here and in scarping-locations.service.ts
async function scarpLocations() {
  return await scarpGeoNamesLocations();
}

async function main() {
  console.log((await scarpLocations()).length);
}

main();
