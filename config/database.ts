import { Sequelize } from "sequelize-typescript";
import { User } from "../models/user";
import { Question } from "../models/question";
import { FeynmanUsage } from "../models/feynman-usage";
import { Note } from "../models/note";
import { Quiz } from "../models/quiz";
import { Flashcard } from "../models/flashcard";
import { NoteMessage } from "../models/note-message";
import NoteMindmap from "../models/note-mindmap";
import NoteChunk from "../models/note-chunk";
import NoteQuestion from "../models/note-question";

console.log(process.env.DB_NAME || "tutorai");

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "Test",
  database: process.env.DB_NAME || "tutorai",
  models: [
    User,
    Question,
    FeynmanUsage,
    Note,
    Quiz,
    Flashcard,
    NoteMessage,
    NoteMindmap,
    NoteChunk,
    NoteQuestion,
  ],
  ssl: true,
  dialectOptions: {
    ssl: {
      require: true, // This will help you. But you will see nwe error
      rejectUnauthorized: false, // This line will fix new error
    },
  },
  logging: true,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

export default sequelize;
