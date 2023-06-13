import { AuthGuard } from '@nestjs/passport';

export class JwtGuard extends AuthGuard('jwtstrategy') {
  constructor() {
    super();
  }
}
