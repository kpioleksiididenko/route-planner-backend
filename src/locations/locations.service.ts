import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return await this.prisma.location.findMany({
      include: {
        alternativeNames: true,
        diffcultyRecords: true,
      },
    });
  }
}
