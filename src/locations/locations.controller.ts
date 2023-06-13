import { Controller, Get } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('all')
  async getMe() {
    return await this.locationsService.getAll();
  }
}
