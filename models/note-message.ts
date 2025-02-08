import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_messages",
  timestamps: true,
})
export class NoteMessage extends Model {
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

  @Column({ type: DataType.STRING })
  role!: string;

  @Column({ type: DataType.TEXT })
  content!: string;
}
