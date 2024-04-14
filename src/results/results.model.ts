import { Model, Column, DataType, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from 'src/users/users.model';

@Table({ tableName: 'results' })
export class Results extends Model<Results> {

  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.JSON })
  correctWords: string[];

  @Column({ type: DataType.JSON })
  enteredWords: string[];

  @Column({ type: DataType.JSON })
  mistakes: { time: number, wordIndex: number, letterIndex: number }[];

  @Column({ type: DataType.JSON })
  wpm: number[];

  @Column({ type: DataType.JSON })
  rawWpm: number[];
  
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  userId: number;

  @BelongsTo(() => User)
  user: User;
}