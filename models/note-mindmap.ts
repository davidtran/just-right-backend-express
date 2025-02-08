import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_mindmaps",
  timestamps: true,
})
export class NoteMindmap extends Model {
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
  unique_id!: string;

  @Column
  parentid!: string;

  @Column
  topic!: string;

  @Column
  isroot!: boolean;
}

export default NoteMindmap;
