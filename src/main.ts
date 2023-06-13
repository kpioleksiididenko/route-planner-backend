import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ScarpLocationsService } from './scarping/locations/scarp-locations.service';
import { ConfigService } from '@nestjs/config';
import { ScarpReportsService } from './scarping/reports/scarp-reports.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app
    .useGlobalPipes(new ValidationPipe({ whitelist: true }))
    .setGlobalPrefix('api');

  const config = app.get(ConfigService);

  //TODO fix this ugly hack for dev
  if (isInDevEnviroment(config)) {
    app.enableCors();
  }

  if (scarpLocationsEnabled(config)) {
    const scarpLocationsService = app.get(ScarpLocationsService);
    await scarpLocationsService.scarp();
  }
  if (scarpReportsEnabled(config)) {
    const scarpReportService = app.get(ScarpReportsService);
    scarpReportService.scarp();
  }
  await app.listen(3001);
}

const scarpLocationsEnabled = (config: ConfigService) =>
  config.get('SCARP_LOCATIONS') == 'true';

const scarpReportsEnabled = (config: ConfigService) =>
  config.get('SCARP_REPORTS') == 'true';

const isInDevEnviroment = (config: ConfigService) =>
  config.get('IS_IN_DEV_ENVIROMENT') == 'true';

bootstrap();
