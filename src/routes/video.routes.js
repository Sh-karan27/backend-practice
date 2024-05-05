import { Router } from "express";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(verifyJWT, getAllVideos);

router.route("/publishVideo").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router
  .route("/v/:videoId")
  .get(verifyJWT, getVideoById)
  .patch(verifyJWT, upload.single("thumbnail"), updateVideoDetails)
  .delete(verifyJWT, deleteVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);
export default router;
