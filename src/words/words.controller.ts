import { Body, Controller, Get, Post } from '@nestjs/common';
import { WordsService } from './words.service';

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

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
}
