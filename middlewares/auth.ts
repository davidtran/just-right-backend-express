import { Request, Response, NextFunction } from "express";

import app from "../config/firebaseAdmin";
import { User } from "../models/user";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify the Firebase ID token
    const decodedToken = await app.auth().verifyIdToken(token);
    if (!decodedToken.uid) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    const userRecord = await User.findOne({
      where: { uid: decodedToken.uid as string, is_deleted: false },
    });

    req.user = decodedToken;
    if (userRecord) {
      req.userRecord = userRecord;
    }

    next();
    return;
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
    return;
  }
};
