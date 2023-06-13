import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserId } from 'src/auth/decorator';
import { UserService } from './user.service';
import { JwtGuard } from 'src/auth/guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  async getMe(@UserId() id: number) {
    return await this.userService.get(id);
  }
}
