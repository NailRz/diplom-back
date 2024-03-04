import { Model, Column, DataType, Table } from 'sequelize-typescript';

@Table({ tableName: 'words', createdAt: false, updatedAt: false })
export class Word extends Model<Word> {
  @Column({ type: DataType.STRING })
  ngramHash: string;

  @Column({ type: DataType.STRING })
  nGram: string;

  @Column({ type: DataType.STRING })
  words: string;

  addWord(word: string): void {
    if (!this.words) {
      this.words = word;
    } else {
      this.words += ', ' + word;
    }
  }
}
