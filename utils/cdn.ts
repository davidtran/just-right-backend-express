import aws from "aws-sdk";
import { createReadStream } from "fs";
import path from "path";
import { logError } from "../config/firebaseAdmin";
const mime = require("mime-types");

const spacesEndpoint = new aws.Endpoint("sgp1.digitaloceanspaces.com");
const credentials = new aws.Credentials(
  process.env.SPACE_ACCESS_KEY_ID || "",
  process.env.SPACE_SECRET_ACCESS_KEY || ""
);
const BUCKET_NAME = "tutorai";

const s3Client = new aws.S3({
  endpoint: spacesEndpoint,
  region: process.env.SPACE_REGION,
  credentials: credentials,
});

export async function uploadObject(filepath: string): Promise<string | null> {
  console.log("uploading...");
  return new Promise(async (resolve, reject) => {
    const fileStream = createReadStream(filepath);
    const fileName = path.basename(filepath);
    console.log(filepath);
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ACL: "public-read",
      ContentType: mime.lookup(filepath) || "audio/mp3",
    };

    try {
      console.time("uploadObject");
      s3Client.upload(params, undefined, (err, data) => {
        console.log(err, data);
        fileStream.destroy();
        console.timeEnd("uploadObject");
        if (!err) resolve(getS3PublicPath(filepath));
      });
    } catch (error) {
      logError(error as Error, {
        filepath,
      });
      console.error("Error uploading file: ", error);
      reject("Error uploading file to Digital Ocean Spaces");
    }
  });
}

async function getS3PublicPath(filePath: string) {
  return `${process.env.SPACE_CDN_END_POINT}/${path.basename(filePath)}`;
}
