import { scarpWikipediaLocations } from './wikipedia';

async function main() {
  const locations = await scarpWikipediaLocations();
  console.log(locations.length);
  console.log(locations.slice(0, 10));
  console.log(locations[305]);
  console.log(locations[600]);
}
main();
