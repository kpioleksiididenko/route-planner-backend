import {
  LocationDifficulty,
  TripDifficulty,
  Season,
  TripType,
  LocationType,
} from '@prisma/client';

//TODO add region
export type ReportDto = {
  title: string;
  authorName: string;
  tripType: TripType;
  difficulty: TripDifficulty | undefined;
  season: Season;
  year: Date;
  stops: Array<RouteStopDto>;
  url: string;
  fileUrl?: string;
};

export type LocationDto = {
  name: string;
  difficulty?: LocationDifficulty;
  elevation?: number;
  type?: LocationType;
};

export type RouteStopDto = {
  number: number;
  location: LocationDto;
  name?: string;
};
