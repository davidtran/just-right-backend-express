import { Router } from "express";
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
import note from "./note";
import solve from "./solve";
import predictLanguage from "./predict-language";

const router = Router();

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
router.use("/note", note);
router.use("/solve", solve);
router.use(predictLanguage);

export default router;
