import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "notes",
  timestamps: true,
})
export class Note extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column
  title!: string;

  @Column({ type: DataType.TEXT })
  content!: string;

  @Column({ type: DataType.TEXT })
  summary!: string;

  @Column({ type: DataType.TEXT })
  original_summary!: string;

  @Column({
    type: "VECTOR(1536)",
  })
  embedding!: string;

  @Column({ type: DataType.UUID })
  user_id!: string;

  @Column
  source_type!: string;

  @Column({ type: DataType.ARRAY(DataType.STRING) })
  resource_urls!: string[];

  @Default(false)
  @Column
  is_deleted!: boolean;

  @Default(false)
  @Column
  is_sample!: boolean;

  @Default("pending")
  @Column
  processing_status!: string;

  @Column({
    type: DataType.JSONB,
  })
  timestamps!: string;

  @Column
  source_language!: string;

  @Column
  target_language!: string;

  @Column
  error_message!: string;
}
