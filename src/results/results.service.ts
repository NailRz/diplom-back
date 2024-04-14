import { Injectable } from '@nestjs/common';
import { Results } from './results.model';
import { InjectModel } from '@nestjs/sequelize';
import { CreateResultDto } from './dto/create-result-dto';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Results) private resultsModel: typeof Results,
  ) {}

  async create(dto: CreateResultDto, userId: number): Promise<Results> {
    const result = await this.resultsModel.create({ ...dto, userId });
    return result;
  }

  async findAll(userId: number): Promise<Results[]> {
    const results = await this.resultsModel.findAll({ where: { userId } });
    return results;
  }

  async findOne(id: number, userId: number): Promise<Results> {
    const result = await this.resultsModel.findOne({ where: { id, userId } });
    return result;
  }

  async delete(id: number, userId: number): Promise<void> {
    const result = await this.resultsModel.findOne({ where: { id, userId } });
    if (result) {
      await result.destroy();
    }
  }
}
