import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Word } from './words.model';
import { Sequelize } from 'sequelize';
import { shuffle, toArray } from 'lodash';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);

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

  private calculateNGrams = (word: string): string[] => {
    if (word.length === 1) {
      return [word];
    }
    const trigrams = this.getTrigrams(word);
    const bigrams = this.getBigrams(word);
    return [...trigrams, ...bigrams];
  };

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
  private evaluateFitnessForWords(
    words: string[],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>
  ): number {
    const wordNGrams = words.flatMap((word) => this.calculateNGrams(word));
    const letterNGrams = this.getLetterNGrams(letterErrors);
    const combinationNGrams = this.getCombinationNGrams(combinationErrors);
    
    const matchedNGrams = wordNGrams.filter(
      (nGram) =>
        letterNGrams.includes(nGram) || combinationNGrams.includes(nGram[0] + nGram[1])
    );
    const totalNGrams = wordNGrams.length;
    return totalNGrams > 0 ? (matchedNGrams.length / totalNGrams) * 100 : 0;
  }
  async getWordsByTopErrors(
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): Promise<string[]> {
    // Находим топ 5 ошибок в letterErrors и combinationErrors
    const combinationErrorsMap = new Map(Object.entries(combinationErrors));
    const letterErrorsArray = toArray(letterErrors);
    const topLetterErrors = letterErrorsArray
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((element) => element[0])
      .filter(Boolean);
  
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
  
    const finalWords = [...words, ...remainingWords];
  
    // Вычисляем фитнес для слов
    const fitness = this.evaluateFitnessForWords(finalWords, letterErrors, combinationErrors);
    this.logger.debug(`Фитнес для слов, подобранных методом getWordsByTopErrors: ${fitness}`);
  
    return finalWords;
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

  async get500words() {
    const words = await Word.findAll({
      order: Sequelize.literal('RANDOM()'),
      limit: 500,
    });
    const arr = words.flatMap((word) => word.words.split(', ')).slice(0, 500);
    arr.sort(() => Math.random() - 0.5);
    return arr;
  }

  private preprocessWords(words: string): string[] {
    return words.split(/[ ,,]+/).filter((word) => word.length > 0);
  }

  async getWordsByTopErrorsWithGA(
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): Promise<string[]> {
    let population = await this.initializePopulation();
    const maxGenerations = 50;
    const fitnessHistory = [];
    let bestFitness = 0;
    let bestFitnessGen = 0;
    let bestWords = [];

    for (let generation = 0; generation < maxGenerations; generation++) {
      const fitnesses = this.evaluateFitness(
        population,
        letterErrors,
        combinationErrors,
      );
      const currentMaxFitness = Math.max(...fitnesses);
      const currentMinFitness = Math.max(...fitnesses);
      const currentBestIndex = fitnesses.indexOf(currentMaxFitness);
      fitnessHistory.push(currentMaxFitness);
      console.log(fitnessHistory[generation], '    ', fitnessHistory[generation-1])
      this.logger.debug(
        `Generation ${generation}: Current Fitnesses = ${fitnesses}`,
      );
      this.logger.debug(
        `Generation ${generation}: Max Fitness = ${currentMaxFitness}`,
      );

      if (currentMaxFitness > bestFitness) {
        bestFitness = currentMaxFitness;
        bestWords = population[currentBestIndex];
        bestFitnessGen = generation;
        this.logger.debug(
          `New best fitness found: ${bestFitness} in generation ${generation}`,
        );
      }

      let flag = 0;

      if (generation > 5 && fitnessHistory[generation] == fitnessHistory[generation - 1]) {
        flag += 1;
        if (flag === 2){
          this.logger.debug('Converged, stopping early.');
          break;
        }
      } else {
        flag = 0
      }

      const parents = this.selectParents(fitnesses);
      const child = this.crossover(parents, population);
      const mutatedChild = await this.mutate(
        child,
        letterErrors,
        combinationErrors,
      );
      population = this.replacePopulation(
        population,
        mutatedChild,
        letterErrors,
        combinationErrors,
      );
    }

    this.logger.debug(`Лучшие слова: ${bestWords}`);
    this.logger.debug(`Лучший фитнесс: ${bestFitness}`);
    this.logger.debug(`Поколение с лучшим фитнессом: ${bestFitnessGen}`);

    return bestWords.flatMap((word) => word.split(', ')).slice(0, 500);
  }

  private async initializePopulation(): Promise<string[][]> {
    const population: string[][] = [];
    for (let i = 0; i < 2; i++) {  // я здесь уменьшил с 15 до 2 
      const words = (await this.get500words()).slice(0, 100);
      population.push(words);
    }
    return population;
  }

  private evaluateFitness(
    population: string[][],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): number[] {
    const fitnesses = [];
    for (const words of population) {
      const wordNGrams = words.flatMap((word) => this.calculateNGrams(word));
      const letterNGrams = this.getLetterNGrams(letterErrors);
      const combinationNGrams = this.getCombinationNGrams(combinationErrors);
      
      const matchedNGrams = wordNGrams.filter(
        (nGram) =>
          letterNGrams.includes(nGram) ||
          combinationNGrams.includes(nGram[0] + nGram[1]),
      );
      const totalNGrams = wordNGrams.length;
      const percentage =
        totalNGrams > 0 ? (matchedNGrams.length / totalNGrams) * 100 : 0;
      fitnesses.push(percentage);
    }
    return fitnesses;
  }
  private getLetterNGrams(letterErrors: Map<string, number>): string[] {
    const arr = [];
    letterErrors.forEach((value, key) => {
      if (value[0] !== undefined) {
        arr.push(value[0]); // Исправлено на key вместо value[0]
      }
    });
    // console.log(arr)
    return arr;
  }

  private getCombinationNGrams(
    combinationErrors: Map<string, number>,
  ): string[] {
    const combinationErrorsMap = new Map<string, number>(
      Object.entries(combinationErrors),
    );
    // console.log(Array.from(combinationErrorsMap.keys()).flatMap(this.calculateNGrams))
    return Array.from(combinationErrorsMap.keys()).flatMap(
      this.calculateNGrams,
    );
  }

  private selectParents(fitnesses: number[]): number[] {
    const tournamentSize = 3;
    const selectedParents = [];
    for (let i = 0; i < 2; i++) {
      let best = -1;
      for (let j = 0; j < tournamentSize; j++) {
        const index = Math.floor(Math.random() * fitnesses.length);
        if (best === -1 || fitnesses[index] > fitnesses[best]) {
          best = index;
        }
      }
      selectedParents.push(best);
    }
    return selectedParents;
  }
  

private crossover(parents: number[], population: string[][]): string[] {
  const parent1 = population[parents[0]];
  const parent2 = population[parents[1]];
  const crossoverPoint1 = Math.floor(Math.random() * parent1.length);
  const crossoverPoint2 = Math.floor(Math.random() * parent2.length);
  const start = Math.min(crossoverPoint1, crossoverPoint2);
  const end = Math.max(crossoverPoint1, crossoverPoint2);
  return [
    ...parent1.slice(0, start),
    ...parent2.slice(start, end),
    ...parent1.slice(end),
  ];
}

  private async mutate(
    child: string[],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): Promise<string[]> {
    const mutationRate = 0.15; // Увеличенная вероятность мутации
    for (let i = 0; i < child.length; i++) {
      if (Math.random() < mutationRate) {
        const newWords = (await this.getRandomWords()).split(', ');
        const bestWord = this.getBestWord(
          newWords,
          letterErrors,
          combinationErrors,
        );
        child[i] = bestWord;
      }
    }
    return child;
  }

  private async getRandomWords(): Promise<string> {
    const randomWords = await this.wordModel.findOne({
      order: Sequelize.literal('RANDOM()'),
      limit: 10,
    });
    return randomWords.words;
  }

  private getBestWord(
    words: string[],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): string {
    let bestWord = words[0];
    let bestFitness = this.calculateFitnessForWord(
      bestWord,
      letterErrors,
      combinationErrors,
    );

    for (const word of words) {
      const fitness = this.calculateFitnessForWord(
        word,
        letterErrors,
        combinationErrors,
      );
      if (fitness > bestFitness) {
        bestWord = word;
        bestFitness = fitness;
      }
   
    }

    return bestWord;
  }

  private calculateFitnessForWord(
    word: string,
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): number {
    const wordNGrams = this.calculateNGrams(word);
    const letterNGrams = this.getLetterNGrams(letterErrors);
    const combinationNGrams = this.getCombinationNGrams(combinationErrors);
    const matchedNGrams = wordNGrams.filter(
      (nGram) =>
        letterNGrams.includes(nGram) ||
        combinationNGrams.includes(nGram[0] + nGram[1]),
    );
    return matchedNGrams.length;
  }

  private replacePopulation(
    population: string[][],
    child: string[],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
  ): string[][] {
    const fitnesses = this.evaluateFitness(
      population,
      letterErrors,
      combinationErrors,
    );
    const minFitnessIndex = fitnesses.indexOf(Math.min(...fitnesses));
    const newPopulation = [...population];

    const bestFitnessIndex = fitnesses.indexOf(Math.max(...fitnesses));
    if (minFitnessIndex !== bestFitnessIndex) {
      newPopulation[minFitnessIndex] = child;
    } else {
      newPopulation[minFitnessIndex] = population[bestFitnessIndex];
    }

    return newPopulation;
  }
}
