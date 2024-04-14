import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Results } from './results.model';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    controllers: [ResultsController],
    providers: [ResultsService],
    imports: [SequelizeModule.forFeature([Results]),forwardRef(() => AuthModule),],
    exports: [ResultsService],
  })
  export class ResultsModule {}