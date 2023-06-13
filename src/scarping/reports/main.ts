import { scarpGlobusReports } from './globus';

async function scarpReports() {
  return await scarpGlobusReports();
}

async function main() {
  const reports = await scarpReports();
  console.log(reports);
}

main();
