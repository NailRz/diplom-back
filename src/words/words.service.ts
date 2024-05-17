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
      const fitnesses = this.evaluateFitness(population, letterErrors, combinationErrors);
      fitnessHistory.push(Math.max(...fitnesses));
      this.logger.debug(`Generation ${generation}: Fitness = ${fitnessHistory[generation]}`);

      if (fitnessHistory[generation] > bestFitness) {
        bestFitness = fitnessHistory[generation];
        bestWords = population[0];
        bestFitnessGen = generation;
      }

      if (generation > 0 && fitnessHistory[generation] === fitnessHistory[generation - 1]) {
        this.logger.debug('Converged, stopping early.');
        break;
      }

      const parents = this.selectParents(fitnesses);
      const child = this.crossover(parents, population);
      const mutatedChild = await this.mutate(child);
      population = this.replacePopulation(population, mutatedChild);
    }

    this.logger.debug(`Best words: ${bestWords}`);
    this.logger.debug(`Best fitness: ${bestFitness}`);
    this.logger.debug(`Best fitness gen: ${bestFitnessGen}`);

    return bestWords.flatMap((word) => word.split(', ')).slice(0, 500);
  }

  private async initializePopulation(): Promise<string[][]> {
    const population: string[][] = [];
    for (let i = 0; i < 10; i++) { // Создаем начальную популяцию из 10 наборов слов
      const wordsString = (await this.get100words()).join(' ');
const words = this.preprocessWords(wordsString);
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
          letterNGrams.includes(nGram) || combinationNGrams.includes(nGram[0] + nGram[1]),

      );
      const fitness = matchedNGrams.length;
      fitnesses.push(fitness);

    }

    return fitnesses;
  }

  private getLetterNGrams = (letterErrors: Map<string, number>): string[] => {
    const arr = []
    letterErrors.forEach((value, key) => {
      if (key !== undefined) {
        arr.push(value[0])
      }

    });
    // console.log(arr)
    return arr;
  };

  private getCombinationNGrams(combinationErrors: Map<string, number>): string[] {
    const combinationErrorsMap = new Map<string, number>(Object.entries(combinationErrors));
    // console.log(Array.from(combinationErrorsMap.keys()).flatMap(this.calculateNGrams))
    return Array.from(combinationErrorsMap.keys()).flatMap(this.calculateNGrams);
  }

  private selectParents(fitnesses: number[]): number[] {
    const totalFitness = fitnesses.reduce((sum, fitness) => sum + fitness, 0);
    const selectionProbabilities = fitnesses.map((fitness) => fitness / totalFitness);
    const selectedParents = [];

    for (let i = 0; i < 2; i++) {
      const randomValue = Math.random();
      let cumulativeProbability = 0;

      for (let j = 0; j < selectionProbabilities.length; j++) {
        cumulativeProbability += selectionProbabilities[j];

        if (randomValue < cumulativeProbability) {
          selectedParents.push(j);
          break;
        }
      }
    }

    return selectedParents;
  }

  private crossover(parents: number[], population: string[][]): string[] {
    const parent1 = population[parents[0]];
    const parent2 = population[parents[1]];
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child = [
      ...parent1.slice(0, crossoverPoint),
      ...parent2.slice(crossoverPoint),
    ];
    return child;
  }

  private async mutate(child: string[]): Promise<string[]> {
    const mutationRate = 0.3; // 10% шанс мутации каждого слова
    return Promise.all(child.map(async word => {
      if (Math.random() < mutationRate) {
        return this.getRandomWord();
      }
      return word;
    }));
  }

  private async getRandomWord(): Promise<string> {
    const randomWord = await this.wordModel.findOne({
      order: Sequelize.literal('RANDOM()'),
      limit: 1,
    });
    return randomWord.words;
  }

  private replacePopulation(population: string[][], child: string[]): string[][] {
    const fitnesses = this.evaluateFitness(population, new Map(), new Map());
    const minFitnessIndex = fitnesses.indexOf(Math.min(...fitnesses));
    const newPopulation = [...population];
    newPopulation[minFitnessIndex] = child;
    return newPopulation;
  }
}
  