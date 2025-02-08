import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
} from "sequelize-typescript";

@Table
export class Question extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column
  type!: string;

  @Column({
    type: DataType.TEXT,
  })
  content!: string;

  @Column
  key!: string;

  @Column({
    type: DataType.TEXT,
  })
  question!: string;

  @Column
  math!: boolean;

  @Column({
    type: DataType.TEXT,
  })
  short_answer!: string;

  @Column({
    type: DataType.TEXT,
  })
  detail_answer!: string;

  @Column({ type: DataType.UUID })
  user_id!: string;

  @Default(false)
  @Column
  is_deleted!: boolean;
}
