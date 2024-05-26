import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Word } from './words.model';
import { Sequelize } from 'sequelize';
import { shuffle, toArray } from 'lodash';

let bestWordsHistory: string[] = [];
let flag = 0;

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

  private calculateNGrams(word: string): string[] {
    if (!word) {
      // console.log(word.length)
      throw new Error('Слово не может быть undefined или null');
    }
  
    const nGrams = [];
    for (let i = 0; i < word.length - 1; i++) {
      nGrams.push(word.slice(i, i + 2));
    }
    return nGrams;
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
  // async  getTopErrors(
  //   letterErrors: Map<string, number>,
  //   combinationErrors: { [key: string]: number }
  // ): Promise<{ topLetterErrors: [string, number][], topCombinationErrors: { [key: string]: number } }> {
  
  //   // Сортировка и взятие первых 5 элементов для letterErrors
  //   const topLetterErrorsArray = Array.from(letterErrors.entries())
  //     .sort((a, b) => b[1] - a[1])
  //     .slice(0, 5);
  
  //   // Сортировка и взятие первых 5 элементов для combinationErrors
  //   const topCombinationErrorsArray = Object.entries(combinationErrors)
  //     .sort(([, a], [, b]) => b - a)
  //     .slice(0, 5);
  
  //   // Преобразование массива в объект
  //   const topCombinationErrors = topCombinationErrorsArray.reduce((acc, [key, value]) => {
  //     acc[key] = value;
  //     return acc;
  //   }, {} as { [key: string]: number });
  
  //   return { topLetterErrors: topLetterErrorsArray, topCombinationErrors };
  // }

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
    
    const wordsWithErrors: string[] = [];
  
    for (const letter of topLetterErrors) {
      const words = await this.findWordsByLetter(letter);
      wordsWithErrors.push(...words);
    }
  
    for (const combination of topCombinationErrors) {
      const words = await this.findWordsByCombination(combination);
      wordsWithErrors.push(...words);
    }
  

    
    const uniqueWordsWithErrors = shuffle(Array.from(new Set(wordsWithErrors)));
  

    const wordsWithErrorsCount = Math.floor(uniqueWordsWithErrors.length * 0.6);
    const words = uniqueWordsWithErrors.slice(0, wordsWithErrorsCount);
    
    const randomWords = await this.get100words();
    const remainingWordsCount = 100 - wordsWithErrorsCount;
    const remainingWords = shuffle(randomWords).slice(0, remainingWordsCount);
  
    const finalWords = [...words, ...remainingWords];
  
    
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
  private sortedRandomWords: string[] = [];
  private usedWords: Set<string> = new Set();

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
    // const { topLetterErrorsMap, topCombinationErrorsMap } = await this.getTopErrors(letterErrors, combinationErrors);

  
    // Получаем случайные слова один раз
    let randomWords = await this.getInitialRandomWords();
  
    for (let generation = 0; generation < maxGenerations; generation++) {
    // console.log(this.usedWords)

      const fitnesses = this.evaluateFitness(
        population,
        letterErrors,
        combinationErrors,
      );
      const currentMaxFitness = Math.max(...fitnesses);
      const currentMinFitness = Math.min(...fitnesses);
      const currentBestIndex = fitnesses.indexOf(currentMaxFitness);
      fitnessHistory.push(currentMaxFitness);
  
      this.logger.debug(
        `Generation ${generation}: Current Fitnesses = ${fitnesses}`,
      );
      this.logger.debug(
        `Generation ${generation}: Max Fitness = ${currentMaxFitness}`,
      );
  
      
  
     
      console.log(bestFitness /  currentMaxFitness)
      if (generation > 5 && (bestFitness /  currentMaxFitness > 0.95)) {
        flag += 1;
        console.log(flag)  
        if (flag === 6){
          this.sortedRandomWords = [];
          this.usedWords = new Set();
          this.logger.debug('Converged, stopping early.');
          break;
        }
      } else {
        flag = 0;
      }

      if (currentMaxFitness > bestFitness) {
        bestFitness = currentMaxFitness;
        bestWords = population[currentBestIndex];
        bestFitnessGen = generation;
        this.logger.debug(
          `New best fitness found: ${bestFitness} in generation ${generation}`,
        );
      }
  
      const parents = this.selectParents(fitnesses);
      const child = this.crossover(parents, population);
      const mutatedChild = await this.mutate(
        child,
        letterErrors,
        combinationErrors,
        randomWords, // Передаем массив случайных слов
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
    bestWordsHistory = []
    return bestWords.flatMap((word) => word.split(', ')).slice(0, 500);
  }
  
  private async initializePopulation(): Promise<string[][]> {
    const population: string[][] = [];
    for (let i = 0; i < 2; i++) { 
      const words = (await this.get100words()).slice(0, 100);
      population.push(words);
    } 
    return population;  
  }


  private async getInitialRandomWords(): Promise<string[]> {
    const words = await Word.findAll({
      order: Sequelize.literal('RANDOM()'),
      limit: 400,
    });
    return words.flatMap((word) => word.words.split(', ')).slice(0, 500);
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
        arr.push(value[0]);
      }
    });
    // console.log(arr.sort().slice(0, 4))
    // arr.sort();
    return arr;

  }

  private getCombinationNGrams(
    combinationErrors: Map<string, number>,
  ): string[] {
    const combinationErrorsMap = new Map<string, number>(
      Object.entries(combinationErrors),
    );
    return Array.from(combinationErrorsMap.keys())
  .filter(key => key.length > 0) 
  .flatMap(this.calculateNGrams);
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
private getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


  // Your existing methods...

  private async mutate(
    child: string[],
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>,
    randomWords: string[],
  ): Promise<string[]> {
    const mutationRate = 0.05; // вероятность мутации

    if (this.sortedRandomWords.length === 0) {
      await this.initializeSortedRandomWords(letterErrors, combinationErrors);
    }

    for (let i = 0; i < child.length; i++) {
      if (Math.random() < mutationRate) {
        if (this.sortedRandomWords.length === 0) {
          await this.initializeSortedRandomWords(letterErrors, combinationErrors);
        }

        let newWordIndex = 0;
        while (newWordIndex < this.sortedRandomWords.length && this.usedWords.has(this.sortedRandomWords[newWordIndex])) {
          newWordIndex++;
        }

        if (newWordIndex < this.sortedRandomWords.length) {
          const newWord = this.sortedRandomWords[newWordIndex];
          child[i] = newWord;
          this.usedWords.add(newWord);
        } else {
          this.logger.debug('Не удалось найти подходящее слово для замены, повтор.');
          await this.initializeSortedRandomWords(letterErrors, combinationErrors);
          this.usedWords.clear();
          this.mutate(child, letterErrors, combinationErrors, randomWords);
        }
      }
    }

    return child;
  }

  private async initializeSortedRandomWords(
    letterErrors: Map<string, number>,
    combinationErrors: Map<string, number>
  ): Promise<void> {
    const newRandomWords = await this.getInitialRandomWords();

    // Remove duplicates and previously used words
    const uniqueNewRandomWords = [...new Set(newRandomWords)].filter(word => !this.usedWords.has(word));

    // Sort words by their fitness in descending order
    uniqueNewRandomWords.sort((a, b) => {
      const fitnessA = this.calculateFitnessForWord(a, letterErrors, combinationErrors);
      const fitnessB = this.calculateFitnessForWord(b, letterErrors, combinationErrors);
      return fitnessB - fitnessA;
    });

    this.sortedRandomWords.push(...uniqueNewRandomWords);
  }

  // private async getRandomWords(): Promise<string> {
  //   const randomWords = await this.wordModel.findOne({
  //     order: Sequelize.literal('RANDOM()'),
  //     limit: 10,
  //   });
  //   return randomWords.words;
  // }

  // private getBestWord(
  //   words: string[],
  //   letterErrors: Map<string, number>,
  //   combinationErrors: Map<string, number>,
  // ): string {
  //   let bestWord = words[0];
  //   let bestFitness = this.calculateFitnessForWord(
  //     bestWord,
  //     letterErrors,
  //     combinationErrors,
  //   );

  //   for (const word of words) {
  //     // console.log(word);
  //     const fitness = this.calculateFitnessForWord(
  //       word,
  //       letterErrors,
  //       combinationErrors,
  //     );
  //     if (fitness > bestFitness) {
  //       bestWord = word;
  //       bestFitness = fitness;
  //     }
   
  //   }

  //   return bestWord;
  // }

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
