import {
  Table,
  Column,
  Model,
  Default,
  PrimaryKey,
  DataType,
} from "sequelize-typescript";

@Table
export class User extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column
  uid!: string;

  @Column
  name!: string;

  @Column
  grade!: string;

  @Column
  locale!: string;

  @Column
  email!: string;

  @Default(false)
  @Column
  is_deleted!: boolean;

  @Default(false)
  @Column
  is_pro!: boolean;
}
