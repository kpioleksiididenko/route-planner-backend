import { LocationDifficulty, LocationType } from '.prisma/client';

export type LocationDto = {
  name: string;
  alternateNames: string[];
  latitude?: number;
  longitude?: number;
  elevation?: number;
  type: LocationType;
  difficulty?: LocationDifficulty;
  description?: string;
};
