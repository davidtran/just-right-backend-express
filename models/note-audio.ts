import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_audios",
  timestamps: true,
})
export class NoteAudio extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column({ type: DataType.UUID })
  note_id!: string;

  @Column({ type: DataType.STRING(500) })
  file_url!: string;

  @Column({ type: DataType.TEXT })
  audio_content!: string;

  @Column
  language!: string;

  @Default("pending")
  @Column
  status!: string; // pending, processing, completed, error

  @Column
  error_message!: string;

  @Column({ type: DataType.INTEGER })
  duration_seconds!: number;

  @Column({ type: DataType.DATE })
  last_generated_at!: Date;
}

export default NoteAudio;
