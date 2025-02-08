import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_questions",
  timestamps: true,
})
export class NoteQuestion extends Model {
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
    type: DataType.STRING(200),
  })
  question!: string;

  @Column({
    type: DataType.STRING(200),
  })
  best_answer!: string;
}

export default NoteQuestion;
