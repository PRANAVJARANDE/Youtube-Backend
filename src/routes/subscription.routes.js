import {Router} from 'express'
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { getSubscribedChannels, toggleSubscription } from '../controllers/subscription.controller.js';

const router = Router();
router.use(verifyJWT);

router.route('/c/:channelUsername').post(toggleSubscription);
router.route('/mysubscribedChannels').get(getSubscribedChannels);

export default router;