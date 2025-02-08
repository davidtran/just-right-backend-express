import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "note_test_results",
  timestamps: true,
})
export class NoteTestResult extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column
  note_id!: string;
}
