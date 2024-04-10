import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Word } from './words.model';
import { Sequelize } from 'sequelize';

@Injectable()
export class WordsService {

  constructor(
    @InjectModel(Word)
    private wordModel: typeof Word,
  ) {}
  
  async get100words(){
    const words = await Word.findAll({
        order: Sequelize.literal('RANDOM()'), 
        limit: 100,
      });
    const arr = words.flatMap((word => word.words.split(', '))).slice(0, 100)
    arr.sort(() => Math.random() - 0.5)
    return arr;
  } 
  
  async getAllWords(){
    const words = await Word.findAll({
        attributes: ['words'], 
      });
    return words;
   
      
}
  async addWord(wordOrWords: string | string[]): Promise<string> {
    let wordsToAdd: string[];

    if (typeof wordOrWords === 'string') {
      wordsToAdd = [wordOrWords];
    } else {
      wordsToAdd = wordOrWords;
    }

    for (const word of wordsToAdd) {
      await this.addWordToDatabase(word);
    }

    return 'Слова успешно добавлены';
  }

  private async addWordToDatabase(word: string): Promise<void> {
    const nGrams = this.calculateNGrams(word);

    for (const nGram of nGrams) {
      const existingWord = await this.wordModel.findOne({
        where: {
          ngramHash: this.calculateHash(nGram),
        },
      });

      if (!existingWord) {
        const newWord = this.wordModel.build({
          ngramHash: this.calculateHash(nGram),
          nGram: nGram,
        });
        newWord.addWord(word); 
        await newWord.save(); 
      } else {
        if (!existingWord.words.includes(word)) {
          existingWord.addWord(word); 
          await existingWord.save(); 
        }
      }
    }
  }

  private getTrigrams(word: string): string[] {
    const trigrams = [];
    for (let i = 0; i < word.length - 2; i++) {
      trigrams.push(word.substring(i, i + 3));
    }
    return trigrams;
  }

  private getBigrams(word: string): string[] {
    const bigrams = [];
    for (let i = 0; i < word.length - 1; i++) {
      bigrams.push(word.substring(i, i + 2));
    }
    return bigrams;
  }

  private calculateNGrams(word: string): string[] {
    if (word.length === 1) {
      return [word];
    }
    const trigrams = this.getTrigrams(word);
    const bigrams = this.getBigrams(word);
    return [...trigrams, ...bigrams];
  }

  private calculateHash(ngram: string): string {
    let hash = '';
    for (let i = 0; i < ngram.length; i++) {
      const charCode = ngram.charCodeAt(i);
      hash += charCode.toString();
      if (i !== ngram.length - 1) {
        hash += '_';
      }
    }
    return hash;
  }
}
