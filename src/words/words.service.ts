import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Word } from './words.model';
import { Sequelize } from 'sequelize';
import { shuffle } from 'lodash';

@Injectable()
export class WordsService {
  constructor(
    @InjectModel(Word)
    private wordModel: typeof Word,
  ) {}

  async get100words() {
    const words = await Word.findAll({
      order: Sequelize.literal('RANDOM()'),
      limit: 100,
    });
    const arr = words.flatMap((word) => word.words.split(', ')).slice(0, 100);
    arr.sort(() => Math.random() - 0.5);
    return arr;
  }

  async getAllWords() {
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

  async getWordsByTopErrors(letterErrors: Map<string, number>, combinationErrors: Map<string, number>,): Promise<string[]> {
    // Находим топ 5 ошибок в letterErrors и combinationErrors
    const combinationErrorsMap = new Map(Object.entries(combinationErrors));

    const topLetterErrors = Array.from(letterErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([letter]) => letter);

    const topCombinationErrors = Array.from(combinationErrorsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([combination]) => combination);
    console.log(topLetterErrors, topCombinationErrors);
    // Находим слова, которые включают эти ошибки
    const wordsWithErrors: string[] = [];

    for (const letter of topLetterErrors) {
      const words = await this.findWordsByLetter(letter);
      wordsWithErrors.push(...words);
    }

    for (const combination of topCombinationErrors) {
      const words = await this.findWordsByCombination(combination);
      wordsWithErrors.push(...words);
    }

    // Удаляем дубликаты и сортируем слова случайным образом
    const uniqueWordsWithErrors = shuffle(Array.from(new Set(wordsWithErrors)));

    // Выбираем 60% слов из wordsWithErrors и остальные слова выбираем случайно
    const wordsWithErrorsCount = Math.floor(uniqueWordsWithErrors.length * 0.6);
    const words = uniqueWordsWithErrors.slice(0, wordsWithErrorsCount);

    const randomWords = await this.get100words();
    const remainingWordsCount = 100 - wordsWithErrorsCount;
    const remainingWords = shuffle(randomWords).slice(0, remainingWordsCount);

    return [...words, ...remainingWords];
  }

  private async findWordsByLetter(letter: string): Promise<string[]> {
    const letterNGrams = this.calculateNGrams(letter);
    const words: string[] = [];

    for (const nGram of letterNGrams) {
      const nGramHash = this.calculateHash(nGram);
      const nGramWords = await this.wordModel.findOne({
        where: {
          ngramHash: nGramHash,
        },
      });

      if (nGramWords) {
        const nGramWordsArray = nGramWords.words.split(', ');
        words.push(...nGramWordsArray);
      }
    }

    return words;
  }

  private async findWordsByCombination(combination: string): Promise<string[]> {
    const combinationNGrams = this.calculateNGrams(combination);
    const words: string[] = [];

    for (const nGram of combinationNGrams) {
      const nGramHash = this.calculateHash(nGram);
      const nGramWords = await this.wordModel.findOne({
        where: {
          ngramHash: nGramHash,
        },
      });

      if (nGramWords) {
        const nGramWordsArray = nGramWords.words.split(', ');
        words.push(...nGramWordsArray);
      }
    }

    return words;
  }
}
