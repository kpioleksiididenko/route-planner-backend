import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return await this.prisma.report.findMany({
      include: {
        route: {
          include: {
            stops: {
              include: { location: true },
            },
          },
        },
      },
    });
  }
}
