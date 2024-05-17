import { ResultsService } from './../results/results.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('words')
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly resultsService: ResultsService,
  ) {}

  @Post()
  async addWord(@Body() wordData: { word: string }) {
    return await this.wordsService.addWord(wordData.word);
  }

  @Get()
  //   getAll() {
  //     return this.wordsService.getAllWords();
  //   }
  get100words() {
    return this.wordsService.get100words();
  }



  // @UseGuards(JwtAuthGuard)
  // @Get('by-ngrams')
  // async getWordsByTopErrors(@Request() req) {
  //   const userId = req.user.id;
  //   const errorStats = await this.resultsService.getErrorStats(userId);

  //   return await this.wordsService.getWordsByTopErrors(
  //     errorStats.letterErrors,
  //     errorStats.combinationErrors,
  //   );
  // }


  @UseGuards(JwtAuthGuard)
  @Get('by-ngrams')
  async generateWordsByErrorss(@Request() req) {
    const userId = req.user.id;
    const errorStats = await this.resultsService.getErrorStats(userId);

    return await this.wordsService.getWordsByTopErrorsWithGA(
      errorStats.letterErrors,
      errorStats.combinationErrors,
    );
  }
}
