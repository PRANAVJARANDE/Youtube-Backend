import {Router} from 'express'
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updatecoverImage } from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router= Router();

router.route('/register').post(upload.fields([
    {
        name:"avatar",
        maxCount:1,
    },
    {
        name:"coverImage",
        maxCount:1,
    }
]),registerUser);


router.route('/login').post(loginUser);

//SECURED ROUTES
router.route('/logout').post(verifyJWT,logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/changePassword').post(verifyJWT,changeCurrentPassword);
router.route('/getcurrentuser').get(verifyJWT,getCurrentUser);
router.route('/update-account').patch(verifyJWT,updateAccountDetails);
router.route("/updateavatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);  
router.route("/updatecover-image").patch(verifyJWT, upload.single("coverImage"), updatecoverImage);
router.route('/C/:username').get(verifyJWT,getUserChannelProfile);
router.route('/history').get(verifyJWT,getWatchHistory);

export default router;