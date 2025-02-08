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

  @Column
  question!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
  })
  answers!: string[];

  @Column
  correct_answer!: number;

  @Column
  explanation!: string;

  @Default("pending")
  @Column
  processing_status!: string;
}
