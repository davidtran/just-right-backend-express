import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env.local" });

import { createNoteJob } from "../queues/note-queue";

createNoteJob({
  id: "Test job",
});
