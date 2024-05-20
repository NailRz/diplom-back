import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/users/users.model';
@Injectable()
export class AuthService {
  constructor(
    private UserService: UsersService,
    private JwtService: JwtService,
  ) {}

  async login(userDto: createUserDto) {
    const user = await this.validateUser(userDto);
    return this.generateToken(user);
  }

  async registration(userDto: createUserDto) {
    const candidate = await this.UserService.getUsersByEmail(userDto.email);
    if (candidate) {
      throw new HttpException(
        'Пользователь уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }
    const hashPassword = await bcrypt.hash(userDto.password, 5);
    const user = await this.UserService.createUser({
      ...userDto,
      password: hashPassword,
    });
    return this.generateToken(user);
  }
  private async generateToken(user: User) {
    const payload = { email: user.email, id: user.id, roles: user.roles };
    return {
      token: this.JwtService.sign(payload),
    };
  }
  private async validateUser(userDto: createUserDto) {
    const user = await this.UserService.getUsersByEmail(userDto.email);
    const passwordEquals = await bcrypt.compare(
      userDto.password,
      user.password,
    );
    if (user && passwordEquals) {
      return user;
    }
    throw new UnauthorizedException({message: 'Некорректный email или пароль'})
  }

  async decodeToken(token: string) {
    try {
      return this.JwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException({ message: 'Невалидный токен' });
    }
  }

  async getUserFromToken(token: string) {
    const decoded = await this.decodeToken(token);
    return this.UserService.getUsersByEmail(decoded.email);
  }
}
