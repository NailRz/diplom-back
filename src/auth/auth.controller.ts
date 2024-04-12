import { createUserDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Body, Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
    constructor(private AuthService: AuthService) {}
    @Post('/login')
    login(@Body() userDto: createUserDto) {
        return this.AuthService.login(userDto)
    }

    @Post('/registration')
    registration(@Body() userDto: createUserDto) {
        return this.AuthService.registration(userDto)
    }

    
}
