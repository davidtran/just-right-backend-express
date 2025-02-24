import { Router, Request, Response } from "express";
import { Question } from "../../models/question";
import { randomString } from "../../utils/general";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { readText } from "../../utils/gpt";
import { RESPONSE_MESSAGES } from "../../constants/constants";
import sequelize from "../../config/database";
import { authenticateUser } from "../../middlewares/auth";
import { resizeAndConvertImageToBase64 } from "../../utils/image";
import { User } from "../../models/user";
import {
  convertImageToTextWithGemini,
  parseExerciseContent,
} from "../../utils/solve";
import { logError } from "../../config/firebaseAdmin";

const router = Router();

router.post(
  "/upload",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { userRecord } = req;
    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!(await canUploadQuestion(userRecord))) {
      return res.status(200).json({ require_pro: true });
    }

    try {
      const { files, fields } = await parseForm(req);
      const type = String(fields.type);
      const key = randomString();
      let data;
      if (type === "text") {
        const content = Array.isArray(fields.content)
          ? fields.content[0]
          : fields.content;
        data = await handleTextUpload(content as string, key, userRecord);
      } else if (type === "photo") {
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!file) throw new Error("No file uploaded");
        data = await handleImageUpload(file.filepath, key, userRecord);
      } else {
        throw new Error("Invalid data type");
      }

      return res.status(200).json(data);
    } catch (e) {
      await logError(e as Error, {
        route: "/upload/upload",
        userId: req.user?.id,
      });
      return res.status(500).json({
        message: e instanceof Error ? e.message : "Internal server error",
      });
    }
  }
);

async function parseForm(
  req: Request
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise(async (resolve, reject) => {
    const uploadDir = join(process.env.ROOT_DIR || process.cwd(), `/uploads`);
    try {
      await stat(uploadDir);
    } catch (e: any) {
      if (e.code === "ENOENT") {
        await mkdir(uploadDir, { recursive: true });
      } else {
        reject(e);
        return;
      }
    }
    const form = formidable({
      maxFiles: 1,
      maxFileSize: 1024 * 1024 * 100,
      uploadDir,
      filename: (_name: string, _ext: string, part: any) => {
        const filename = `${randomString()}.jpg`;
        return filename;
      },
    });

    form.parse(req, function (err: any, fields: any, files: any) {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function canUploadQuestion(userRecord: User) {
  if (userRecord.is_pro) {
    return true;
  } else {
    const questions = await Question.count({
      where: {
        user_id: userRecord.id,
      },
    });
    return questions < 2;
  }
}

async function handleTextUpload(
  content: string,
  key: string,
  userRecord: User
) {
  const questionInfo = await parseExerciseContent(content);

  if (!questionInfo || !questionInfo.content.length) {
    throw new Error(RESPONSE_MESSAGES.INVALID_QUESTION);
  }
  const data = {
    content: questionInfo.content,
    key,
    question: questionInfo.content,
    math: questionInfo.math,
    direct_answer: questionInfo.direct_answer,
    language: userRecord.locale || questionInfo.language,
  };
  const question = await Question.create({
    ...data,
    type: "text",
    user_id: userRecord.id,
  });
  return { id: question.id, content: question.content };
}

async function handleImageUpload(
  filepath: string,
  key: string,
  userRecord: User
) {
  const base64Image = await resizeAndConvertImageToBase64(filepath, 800);
  const content = await convertImageToTextWithGemini(base64Image);

  if (!content || !content.trim().length) {
    throw new Error("Invalid image content");
  }
  const data = {
    content: base64Image,
    key,
    question: content,
  };
  const question = await Question.create({
    ...data,
    type: "photo",
    user_id: userRecord.id,
  });
  return { id: question.id, content: question.content };
}

export default router;
