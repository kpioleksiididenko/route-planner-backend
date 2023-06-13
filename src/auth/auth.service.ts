import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LogInDto, SignupDto } from './dto';
import { getRandomValues } from 'crypto';
import * as argon2 from 'argon2';
import { Prisma, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const ErrCode = {
  UniqueConstraintFailed: 'P2002',
};

function generateSalt(length: number): string {
  const allowedSymbols =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$';
  return Array.from(getRandomValues(new Uint32Array(length)))
    .map((v) => allowedSymbols[v % allowedSymbols.length])
    .join('');
}

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const salt = generateSalt(128);
    const hash = await argon2.hash(dto.password + salt, {});
    const userData = {
      username: dto.username,
      email: dto.email,
      name: dto.name,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: false,
    };
    try {
      const user = await this.prisma.user.create({ data: userData });
      delete user.passwordHash;
      delete user.passwordSalt;
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === ErrCode.UniqueConstraintFailed
      ) {
        throw new ForbiddenException('Credentials taken');
      }
      throw error;
    }
  }

  async logIn(dto: LogInDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) {
      throw new ForbiddenException('Incorrect credentials');
    }
    if (!(await this.passwordMatches(dto.password, user))) {
      throw new ForbiddenException('Incorrect credentials');
    }
    return await this.signToken(user.id);
  }

  async signToken(userId: number): Promise<{ accesToken: string }> {
    const payload = { sub: userId, userId: userId };
    const secret = this.config.get('JWT_SECRET');
    const expiresIn = '15m';
    const token = await this.jwt.signAsync(payload, { expiresIn, secret });
    return { accesToken: token };
  }

  async passwordMatches(password: string, user: User): Promise<Boolean> {
    return await argon2.verify(user.passwordHash, password + user.passwordSalt);
  }
}
