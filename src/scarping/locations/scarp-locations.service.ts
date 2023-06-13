import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { scarpGeoNamesLocations } from './geonames';
import { scarpVpohidLocations } from './vpohid';
import { LocationDto } from './location.dto';
import { Location } from '@prisma/client';
import { distance } from '../util';
import { scarpWikipediaLocations } from './wikipedia';
import { hasCoordinates } from '../util';

@Injectable()
export class ScarpLocationsService {
  constructor(private prisma: PrismaService) {}

  async scarp() {
    const locationDtos = [].concat(
      await scarpGeoNamesLocations(),
      await scarpVpohidLocations(),
      await scarpWikipediaLocations(),
    );
    for (const [i, locationDto] of locationDtos.entries()) {
      if (i % 100 === 0) {
        console.log(`uploading ${i}/${locationDtos.length} location`);
      }
      const location = await this.getLocationIfExists(locationDto);
      if (location) {
        await this.addInfoToLocation(location, locationDto);
        continue;
      }
      const location1 = await this.insertLocation(locationDto);
      await this.insertLocationNames(locationDto, location1);
    }
    console.log('All locations uploaded');
  }

  // TODO
  // threshold in km below what object with same name and type
  // considered same
  static distanceTreshold = 10;

  async getLocationIfExists(
    locationDto: LocationDto,
  ): Promise<Location | undefined> {
    const nameTolocations = await this.prisma.nameToLocation.findMany({
      where: {
        name: locationDto.name,
      },
      include: { location: true },
    });

    return nameTolocations
      .map(e => e.location)
      .find(l => ScarpLocationsService.areSameLocation(l, locationDto));
  }

  static areSameLocation(l1: Location, l2: LocationDto) {
    const coordinatesMatch = (l1: Location, l2: LocationDto) => {
      if (!hasCoordinates(l1) && !hasCoordinates(l2)) {
        return true;
      }
      if (hasCoordinates(l1) && hasCoordinates(l2)) {
        const dist = distance(
          l1.latitude.toNumber(),
          l1.longitude.toNumber(),
          l2.latitude,
          l2.longitude,
        );
        return dist < ScarpLocationsService.distanceTreshold;
      }
      return false;
    };

    return l1.type === l2.type && coordinatesMatch(l1, l2);
  }

  //TODO extract other info besides description
  //TODO rename
  async addInfoToLocation(location: Location, locationDto: LocationDto) {
    if (location.description || !locationDto.description) {
      return;
    }
    await this.prisma.location.update({
      where: {
        id: location.id,
      },
      data: {
        description: locationDto.description,
      },
    });
  }

  async insertLocation(locationDto: LocationDto): Promise<Location> {
    return await this.prisma.location.create({
      data: {
        canonicalName: locationDto.name,
        longitude: locationDto.longitude,
        latitude: locationDto.latitude,
        elevation: locationDto.elevation,
        type: locationDto.type,
      },
    });
  }

  async insertLocationNames(locationDto: LocationDto, location: Location) {
    const locationNames = locationDto.alternateNames.concat([locationDto.name]);
    const nameMappings = locationNames.map(name => {
      return { locationId: location.id, name };
    });
    await this.prisma.nameToLocation.createMany({ data: nameMappings });
  }
}
