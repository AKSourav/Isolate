import * as express from 'express';
import {list_services} from '../controllers/resourceControllers';
import {protect} from "../middleware/authMiddleware";

const router = express.Router()

router.route('/').get(list_services);

export default router;