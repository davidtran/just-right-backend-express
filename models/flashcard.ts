import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "flashcards",
  timestamps: true,
})
export class Flashcard extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.STRING(1000),
  })
  front!: string;

  @Column({
    type: DataType.STRING(1000),
  })
  back!: string;

  @Column({
    type: DataType.UUID,
  })
  note_id!: string;
}
