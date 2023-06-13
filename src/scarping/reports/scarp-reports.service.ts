import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { scarpGlobusReports } from './globus';
import { LocationDto, ReportDto, RouteStopDto } from './dto';
import { Location, Report, Route } from '@prisma/client';
import { minBy, distance, hasCoordinates } from '../util';

@Injectable()
export class ScarpReportsService {
  constructor(private prisma: PrismaService) {}

  async scarp() {
    const reports = await scarpGlobusReports();
    for (const [i, reportDto] of reports.entries()) {
      console.log(`report ${i}/${reports.length}`);
      if (await this.reportExists(reportDto)) {
        continue;
      }
      const route = await this.createRoute(reportDto);
      const report = await this.createReport(reportDto, route);
      await this.createLocationsDifficulty(reportDto, report);
    }
    console.log('Reports scarped');
  }
  //TODO check for bug with possible nameToLocation name added twice

  async reportExists(reportDto: ReportDto) {
    const report = await this.prisma.report.findFirst({
      where: {
        title: reportDto.title,
        authorName: reportDto.authorName,
        year: reportDto.year,
        url: reportDto.url,
      },
    });
    return report !== null;
  }

  // TODO maybe refactor
  async createRoute(report: ReportDto): Promise<Route> {
    const route = await this.prisma.route.create({ data: {} });

    let lastLWithCoordinates: Location | undefined = undefined;
    for (const [stopNumber, stop] of report.stops.entries()) {
      const createdStop = await this.createRouteStop(
        stop,
        route,
        stopNumber,
        lastLWithCoordinates,
      );
      if (hasCoordinates(createdStop.location)) {
        lastLWithCoordinates = createdStop.location;
      }
    }
    return route;
  }

  async createRouteStop(
    stop: RouteStopDto,
    route: Route,
    stopNumber: number,
    lastLocationWithCoordinates: Location | undefined,
  ) {
    let location = await this.findLocation(
      stop.location,
      lastLocationWithCoordinates,
    );
    if (!location) {
      location = await this.createLocationFromStop(stop);
    }
    const stopData = {
      name: stop.name,
      routeId: route.id,
      locationId: location.id,
      stopNumber,
    };
    return await this.prisma.routeStop.create({
      data: stopData,
      include: { location: true },
    });
  }

  //Maximum distance between last and next location
  static LOCATIONS_DISTANCE_THRESHOLD = 100;
  async findLocation(
    locationDto: LocationDto,
    lastLocationWithCoordinates: Location | undefined,
  ): Promise<Location | undefined> {
    const nameToLocations = await this.prisma.nameToLocation.findMany({
      where: {
        name: locationDto.name,
      },
      include: {
        location: true,
      },
    });

    // if locationDto type is unkonwn, types always match
    const typeMatches = (locationDto: LocationDto, location: Location) =>
      locationDto.type === undefined || locationDto.type === location.type;

    // TODO think what to do about types such as polonina
    const possibleLocations = nameToLocations
      .map(e => e.location)
      .filter(location => typeMatches(locationDto, location));

    return this.chooseNextLocation(
      possibleLocations,
      lastLocationWithCoordinates,
    );
  }

  chooseNextLocation(
    possibleLocations: Location[],
    lastLocationWithCoordinates: Location,
  ): Location | undefined {
    if (possibleLocations.length === 0) {
      return undefined;
    }
    // TODO maybe somehow rewrite algorithm to take future locations into account
    if (!lastLocationWithCoordinates) {
      return possibleLocations[0];
    }

    if (!possibleLocations.some(l => hasCoordinates(l))) {
      return possibleLocations[0];
    }

    const possibleLocationsWithCords = possibleLocations.filter(l =>
      hasCoordinates(l),
    );
    const location = minBy(possibleLocationsWithCords, l =>
      distance(
        lastLocationWithCoordinates.latitude.toNumber(),
        lastLocationWithCoordinates.longitude.toNumber(),
        l.latitude.toNumber(),
        l.longitude.toNumber(),
      ),
    );
    const d = distance(
      lastLocationWithCoordinates.latitude.toNumber(),
      lastLocationWithCoordinates.longitude.toNumber(),
      location.latitude.toNumber(),
      location.longitude.toNumber(),
    );
    if (d > ScarpReportsService.LOCATIONS_DISTANCE_THRESHOLD) {
      return undefined;
    }
    return location;
  }

  async createLocationFromStop(stop: RouteStopDto): Promise<Location> {
    return await this.prisma.location.create({
      data: {
        canonicalName: stop.name,
        elevation: stop.location.elevation,
        type: stop.location.type,
      },
    });
  }

  async createLocationsDifficulty(reportDto: ReportDto, report: Report) {
    const stopDtos = reportDto.stops;
    const stops = await this.getRouteStops(report);
    for (let i = 0; i < stopDtos.length; i++) {
      const locationDto = stopDtos[i].location;
      const location = stops[i].location;
      if (locationDto.difficulty) {
        await this.createLocationToDifficulty(locationDto, location, report);
      }
    }
  }

  async getRouteStops(report: Report) {
    return await this.prisma.routeStop.findMany({
      where: { routeId: report.routeId },
      include: { location: true },
    });
  }

  async createLocationToDifficulty(
    locationDto: LocationDto,
    location: Location,
    report: Report,
  ) {
    await this.prisma.locationToDifficulty.create({
      data: {
        locationId: location.id,
        difficulty: locationDto.difficulty,
        season: report.season,
        soureReportId: report.id,
      },
    });
  }

  async createReport(report: ReportDto, route: Route) {
    return await this.prisma.report.create({
      data: {
        title: report.title,
        authorName: report.authorName,
        tripType: report.tripType,
        difficulty: report.difficulty,
        season: report.season,
        year: report.year,
        routeId: route.id,
        url: report.url,
        fileUrl: report.fileUrl,
      },
    });
  }
}
