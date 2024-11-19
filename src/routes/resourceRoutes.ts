import * as express from 'express';
import {list_services} from '../controllers/resourceControllers';
import {create_service} from '../controllers/serviceControllers';
import {protect} from "../middleware/authMiddleware";

const router = express.Router()

router.route('/').get(list_services).post(create_service);

export default router;