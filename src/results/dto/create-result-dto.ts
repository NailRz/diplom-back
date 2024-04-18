import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MistakeDto } from './mistake-dto';

export class CreateResultDto {
  @IsArray({ message: 'Правильные слова должны быть массивом' })
  correctWords: string[];

  @IsArray({ message: 'Введенные слова должны быть массивом' })
  enteredWords: string[];

  @IsArray({ message: 'WPMarray должен быть массивом' })
  wpmArray: string[];

  @IsArray({ message: 'rawWpmArray должен быть массивом' })
  rawWpmArray: string[];

  @IsOptional()
  @IsArray({ message: 'Ошибки должны быть массивом' })
  @ValidateNested({ each: true })
  @Type(() => MistakeDto)
  mistakes?: MistakeDto[];

  calculatedWpm: number;

  calculatedAccuracy: number;

  time: number;

  accuracy: number;
}
