import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";

const router = Router();

router.put(
  "/users/me",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { user, userRecord } = req;
    if (!user || !userRecord) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create an update object with only the fields that exist in the request body
    const updateData: Partial<typeof userRecord> = {};

    // List of allowed fields to update
    const allowedFields = ["is_pro"] as const;

    // Only include fields that exist in the request body
    allowedFields.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });

    // Update only if we have fields to update
    if (Object.keys(updateData).length > 0) {
      await userRecord.update(updateData);
    }

    return res.status(200).json(userRecord.toJSON());
  }
);

export default router;
