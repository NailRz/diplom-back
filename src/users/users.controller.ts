import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService){

    }
    @Post()
    create(@Body() userDto: createUserDto){
        return this.usersService.createUser(userDto);
    }


    @UseGuards(JwtAuthGuard)
    @Get()
    getAll(){
        return this.usersService.getAllUsers();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':email')
    async getUserByEmail(@Param('email') email: string){
        return this.usersService.getUsersByEmail(email);
    }
}
