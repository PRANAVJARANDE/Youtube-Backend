import { Router } from "express";
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, updateVideo } from "../controllers/video.controller.js";

const router=Router();
router.use(verifyJWT);
router.route('/').get(getAllVideos);
router.route('/publishvideo').post(upload.fields([
    {
        name: "videoFile",
        maxCount:1,
    },
    {
        name:"thumbnail",
        maxCount:1,
    }
]),publishAVideo);

router.route('/:videoId')
.get(getVideoById)
.patch(upload.single("thumbnail"),updateVideo)
.delete(deleteVideo)

export default router;