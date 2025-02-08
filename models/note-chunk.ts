import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_chunks",
  timestamps: true,
  indexes: [
    {
      fields: ["note_id", "chunk_index"],
      name: "note_chunk_index_index",
    },
  ],
})
export default class NoteChunk extends Model {
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
    type: DataType.TEXT,
  })
  content!: string;

  @Column({
    type: "VECTOR(1536)",
  })
  embedding!: string;

  @Column({
    type: DataType.INTEGER,
  })
  chunk_index!: number;
}
