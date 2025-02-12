import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "quizzes",
  timestamps: true,
})
export class Quiz extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.UUID,
  })
  note_id!: string;

  @Column({
    type: DataType.STRING(500),
  })
  question!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING(500)),
  })
  answers!: string[];

  @Column({
    type: DataType.NUMBER,
  })
  correct_answer!: number;

  @Column({
    type: DataType.STRING(1000),
  })
  explanation!: string;

  @Default("pending")
  @Column
  processing_status!: string;
}
