import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { User } from "../../models/user";

const router = Router();

router.delete(
  "/users/me",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await User.update({ is_deleted: true }, { where: { uid: user.uid } });

    return res.status(200).send();
  }
);

export default router;
