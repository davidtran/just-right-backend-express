import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";

const router = Router();

router.get(
  "/users/me",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { user, userRecord } = req;
    if (!user || !userRecord) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(200).json(userRecord.toJSON());
  }
);

export default router;
