import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reportsServise: ReportsService) {}

  @Get('all')
  async getAll() {
    return await this.reportsServise.getAll();
  }
}
