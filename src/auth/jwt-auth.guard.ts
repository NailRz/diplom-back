import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException({ message: 'Пользователь не авторизован' });
      }

      const [bearer, token] = authHeader.split(' ');
      if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedException({ message: 'Пользователь не авторизован' });
      }

      const user = await this.authService.getUserFromToken(token);
      if (!user) {
        throw new UnauthorizedException({ message: 'Пользователь не найден' });
      }

      req.user = user;
      return true;
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException({ message: 'Пользователь не авторизован' });
    }
  }
}
