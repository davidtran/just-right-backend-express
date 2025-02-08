import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  PrimaryKey,
} from "sequelize-typescript";

@Table({
  tableName: "feynman_usages",
  timestamps: true,
})
export class FeynmanUsage extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({ type: DataType.UUID })
  user_id!: string;

  @Default(0)
  @Column
  usage_count!: number;
}

export default FeynmanUsage;
