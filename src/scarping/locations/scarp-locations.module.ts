import { Module } from '@nestjs/common';
import { ScarpLocationsService } from './scarp-locations.service';

@Module({
  providers: [ScarpLocationsService],
  exports: [ScarpLocationsModule],
})
export class ScarpLocationsModule {}
