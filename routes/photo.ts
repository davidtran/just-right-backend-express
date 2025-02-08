import { Router, Request, Response } from "express";
import { Question } from "../models/question";
import { randomString } from "../utils/general";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { readImage, readText } from "../utils/gpt";
import { RESPONSE_MESSAGES } from "../constants/constants";
import sequelize from "../config/database";

const router = Router();

router.post("/photo", async (req: Request, res: Response) => {
  try {
    const { files, fields } = await parseForm(req);
    const type = String(fields.type);
    const key = randomString();
    console.log(fields);
    let data;
    if (type === "text") {
      const content = Array.isArray(fields.content)
        ? fields.content[0]
        : fields.content;
      data = await handleTextUpload(
        content as string,
        key,
        parseInt(String(fields.userId))
      );
    } else if (type === "photo") {
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) throw new Error("No file uploaded");
      data = await handleImageUpload(
        file.filepath,
        key,
        parseInt(String(fields.userId))
      );
    } else {
      throw new Error("Invalid data type");
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

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

async function handleTextUpload(content: string, key: string, userId?: number) {
  const questionInfo = await readText(content);
  if (!questionInfo || !questionInfo.parsed_content.trim().length) {
    throw new Error(RESPONSE_MESSAGES.INVALID_QUESTION);
  }
  const data = {
    content: questionInfo.parsed_content,
    key,
    questions: "",
    math: questionInfo.is_math,
  };
  await Question.create({ ...data, type: "photo", user_id: userId });
  return data;
}

async function handleImageUpload(
  filepath: string,
  key: string,
  userId?: number
) {
  const photoContent = await readImage(filepath);
  if (!photoContent || !photoContent.parsed_content) {
    throw new Error("Invalid image content");
  }
  const data = {
    content: photoContent.parsed_content,
    key,
    questions: "",
    math: photoContent.is_math,
  };
  await Question.create({ ...data, type: "photo", user_id: userId });
  return data;
}

export default router;
