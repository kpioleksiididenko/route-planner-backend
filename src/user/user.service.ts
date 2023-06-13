import { Injectable } from '@nestjs/common';
import excludeFields from 'src/prisma/exclude-fields';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async get(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    return excludeFields(user, ['passwordHash', 'passwordSalt']);
  }
}
