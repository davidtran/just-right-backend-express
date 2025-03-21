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
import NoteAudio from "../models/note-audio";

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
    NoteAudio,
  ],
  ssl: true,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    connectTimeout: 60000,
  },
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
    evict: 30000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
  retry: {
    max: 3,
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

export default sequelize;
