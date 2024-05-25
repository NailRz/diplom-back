import { Model, Column, DataType, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from 'src/users/users.model';

@Table({ tableName: 'results' })
export class Results extends Model<Results> {

  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  userId: number;

  @Column({ type: DataType.INTEGER })
  time: number;

  @Column({ type: DataType.FLOAT })
  calculatedWpm: number;

  @Column({ type: DataType.FLOAT })
  calculatedAccuracy: number;

  @Column({ type: DataType.JSON })
  enteredWords: string[];

  @Column({ type: DataType.JSON })
  mistakes: { time: number, wordIndex: number, letterIndex: number, enteredLetter: string, correctLetter: string }[];

  @Column({ type: DataType.JSON })
  wpmArray: string[];

  @Column({ type: DataType.JSON })
  rawWpmArray: string[];

  @Column({ type: DataType.JSON })
  correctWords: string[];
  
  @BelongsTo(() => User)
  user: User;
}