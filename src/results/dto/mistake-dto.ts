import { IsNumber, IsString } from 'class-validator';

export class MistakeDto {
    @IsNumber({}, { message: 'Time must be a number' })
    time: number;
  
    @IsNumber({}, { message: 'Word index must be a number' })
    wordIndex: number;
  
    @IsNumber({}, { message: 'Letter index must be a number' })
    letterIndex: number;
  
    @IsString({ message: 'Entered letter must be a string' })
    enteredLetter: string;
  
    @IsString({ message: 'Correct letter must be a string' })
    correctLetter: string;
  }