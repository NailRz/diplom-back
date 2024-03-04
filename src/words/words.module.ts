import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { Word } from './words.model';

@Module({
  controllers: [WordsController],
  providers: [WordsService],
  imports: [SequelizeModule.forFeature([Word])],
})
export class WordsModule {}
