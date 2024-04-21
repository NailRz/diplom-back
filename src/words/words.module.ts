import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { Word } from './words.model';
import { ResultsModule } from 'src/results/results.module';
import { AuthModule } from 'src/auth/auth.module';
import { ResultsService } from 'src/results/results.service';

@Module({
  controllers: [WordsController],
  providers: [WordsService], 
  imports: [SequelizeModule.forFeature([Word]), ResultsModule, forwardRef(() => AuthModule)],
})
export class WordsModule {}
