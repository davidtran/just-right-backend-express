import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { auth } from "firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";
const { ReadableStream } = require("web-streams-polyfill");
global.ReadableStream = ReadableStream;
// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      userRecord?: User;
    }
  }
}

import express from "express";
import bodyParser from "body-parser";
import sequelize from "./config/database";
import router from "./routes";
import { User } from "./models/user";
// Import note audio queue
import "./queues/note-audio-queue";

const app = express();

app.use(bodyParser.json());

app.listen(7005, async () => {
  await sequelize.sync();
  console.log("Server is running on port 7005");
});

app.use("/api", router);
