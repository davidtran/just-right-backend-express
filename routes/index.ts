import { Router, Request, Response } from "express";
import hello from "./hello";
import question from "./question";
import photo from "./photo";
import query from "./query";
import getUser from "./user/get-user";
import updateUser from "./user/update-user";
import login from "./user/login";
import deleteUser from "./user/delete-user";
import deleteQuestion from "./questions/delete-question";
import questionsList from "./questions/list";
import feynman from "./feynman";
import audio from "./audio";
import upload from "./upload";
import noteRouter from "./note";
import solve from "./solve";
import predictLanguage from "./predict-language";

const router = Router();

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.status(200).json({
    status: "healthy",
    uptime: `${Math.floor(uptime / 60 / 60)}h ${
      Math.floor(uptime / 60) % 60
    }m ${Math.floor(uptime) % 60}s`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    },
    timestamp: new Date().toISOString(),
  });
});

router.use(hello);
router.use(question);
router.use(getUser);
router.use(updateUser);
router.use(login);
router.use(deleteUser);
router.use(photo);
router.use(query);
router.use(questionsList);
router.use(deleteQuestion);
router.use("/feynman", feynman);
router.use("/audio", audio);
router.use("/upload", upload);
router.use("/note", noteRouter);
router.use("/solve", solve);
router.use(predictLanguage);

export default router;
