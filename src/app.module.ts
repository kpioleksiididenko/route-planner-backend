import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScarpLocationsModule } from './scarping/locations/scarp-locations.module';
import { ScarpReportsModule } from './scarping/reports/scarp-reports.module';
import { LocationsModule } from './locations/locations.module';
import { ReportsService } from './reports/reports.service';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    PrismaModule,
    ScarpLocationsModule,
    ScarpReportsModule,
    LocationsModule,
    ReportsModule,
  ],
  providers: [ReportsService],
})
export class AppModule {}
