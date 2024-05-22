import { ForbiddenException, Injectable } from '@nestjs/common';
import { Results } from './results.model';
import { InjectModel } from '@nestjs/sequelize';
import { CreateResultDto } from './dto/create-result-dto';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ResultsService {
  constructor(@InjectModel(Results) private resultsModel: typeof Results) {}

  async create(dto: CreateResultDto, userId: number): Promise<Results> {
    const result = await this.resultsModel.create({ ...dto, userId });
    return result;
  }

  async findAll(userId: number): Promise<Results[]> {
    const results = await this.resultsModel.findAll({
      where: { userId },
      attributes: [
        // 'userId',
        'time',
        'calculatedWpm',
        'calculatedAccuracy',
        'createdAt',
      ],
    });
    return results;
  }

  async findLast10(userId: number): Promise<Results[]> {
    const results = await this.resultsModel.findAll({
      where: { userId },
      limit: 10,
      order: [['id', 'DESC']],
    });
    return results;
  }

  async findOne(id: number, userId: number): Promise<Results> {
    const result = await this.resultsModel.findOne({ where: { id, userId } });
    return result;
  }

  async delete(id: number, userId: number): Promise<void> {
    const result = await this.resultsModel.findOne({ where: { id, userId } });
    if (!result) {
      throw new ForbiddenException(
        'Такого результата не существует или это не ваш результат',
      );
    }
    await result.destroy();
  }

  async getBestWpm(userId: number): Promise<any> {
    const results = await this.resultsModel.findAll({
      where: { userId },
      attributes: [
        'time',
        [Sequelize.fn('max', Sequelize.col('calculatedWpm')), 'maxWpm'],
      ],
      group: ['time'],
      order: [['time', 'ASC']],
      raw: true,
    });
    console.log(results);
    return results;
  }

  async getErrorStats(userId: number): Promise<any> {
    const results = await this.findLast10(userId);

    const letterErrors = new Map();

    const combinationErrors = new Map();

    results.forEach((result) => {
      let currentWordErrors = [];

      result.mistakes.forEach((mistake, index) => {
        // Обновляем частоту ошибок по буквам
        const correctLetter = mistake.correctLetter;
        if (letterErrors.has(correctLetter)) {
          letterErrors.set(correctLetter, letterErrors.get(correctLetter) + 1);
        } else {
          letterErrors.set(correctLetter, 1);
        }

        // Обновляем текущий массив ошибок для слова
        currentWordErrors.push(mistake);

        // Если это не последняя ошибка в слове, продолжаем итерацию
        if (
          index < result.mistakes.length - 1 &&
          result.mistakes[index + 1].wordIndex === mistake.wordIndex
        ) {
          return;
        }

        // Обновляем частоту ошибок по комбинациям букв для текущего слова
        for (let i = 0; i < currentWordErrors.length - 1; i++) {
          for (let j = i + 1; j < currentWordErrors.length; j++) {
            const combination = currentWordErrors
              .slice(i, j + 1)
              .map((error) => error.correctLetter)
              .join('');
            if (combination.length <= 3) {
              if (combinationErrors.has(combination)) {
                combinationErrors.set(
                  combination,
                  combinationErrors.get(combination) + 1,
                );
              } else {
                combinationErrors.set(combination, 1);
              }
            }
          }
        }

        // Сбрасываем текущий массив ошибок для слова
        currentWordErrors = [];
      });
    });

    // Преобразуем Map в массив для возврата клиенту
    const letterErrorsArray = Array.from(letterErrors.entries());

    // Преобразуем Map в объект для возврата клиенту
    const combinationErrorsObject = Object.fromEntries(
      combinationErrors.entries(),
    );

    return {
      letterErrors: letterErrorsArray,
      combinationErrors: combinationErrorsObject,
    };
  }
}
