import { Module } from '@nestjs/common';
import { ScarpReportsService } from './scarp-reports.service';

@Module({
  providers: [ScarpReportsService],
  exports: [ScarpReportsService],
})
export class ScarpReportsModule {}
