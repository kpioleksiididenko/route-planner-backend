import { scarpVpohidLocations } from './vpohid';

// TODO replace it with something like 
// import { pathToFileURL } from 'url';
// const isExecutedAsSeparateFile = () =>
//   import.meta.url === pathToFileURL(process.argv[1]).href;

// if (isExecutedAsSeparateFile()) {
//   main();
// }

function main() {
  scarpVpohidLocations();
}
main();
