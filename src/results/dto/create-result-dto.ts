import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MistakeDto } from './mistake-dto';

export class CreateResultDto {
  @IsArray({ message: 'Correct words must be an array' })
  correctWords: string[];

  @IsArray({ message: 'Entered words must be an array' })
  enteredWords: string[];

  @IsOptional()
  @IsArray({ message: 'Mistakes must be an array' })
  @ValidateNested({ each: true })
  @Type(() => MistakeDto)
  mistakes?: MistakeDto[];

  @IsOptional()
  @IsArray({ message: 'WPM must be an array' })
  @ValidateNested({ each: true })
  @Type(() => Number)
  wpm?: number[];

  @IsOptional()
  @IsArray({ message: 'Raw WPM must be an array' })
  @ValidateNested({ each: true })
  @Type(() => Number)
  rawWpm?: number[];
}
