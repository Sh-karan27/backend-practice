import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/c/:channelId")
  .get(verifyJWT, getSubscribedChannels)
  .post(toggleSubscription);

router.route("/u/:channelId").get(verifyJWT, getUserChannelSubscribers);

export default router;
