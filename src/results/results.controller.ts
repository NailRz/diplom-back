import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result-dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateResultDto, @Request() req) {
    const userId = req.user.id;
    const result = await this.resultsService.create(dto, userId);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/all')
  async findAll(@Request() req) {
    const userId = req.user.id;
    const results = await this.resultsService.findAll(userId);
    return results;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/lastTen')
  async findLastTen(@Request() req) {
    const userId = req.user.id;
    const results = await this.resultsService.findLast10(userId);
    return results;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/error-stats')
  async getErrorStats(@Request() req) {
    const userId = req.user.id;
    const errorStats = await this.resultsService.getErrorStats(userId);
    return errorStats;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/bestWpm')
  async getBestWpm(@Request() req) {
    const userId = req.user.id;
    const bestWpm = await this.resultsService.getBestWpm(userId);
    return bestWpm;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req) {
    const userId = req.user.id;
    const result = await this.resultsService.findOne(id, userId);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: number, @Request() req) {
    const userId = req.user.id;
    await this.resultsService.delete(id, userId);
    return { message: 'Result deleted' };
  }
}
