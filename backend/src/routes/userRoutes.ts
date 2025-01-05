import * as express from 'express';
import {registerUser,authUser, allUsers} from '../controllers/userControllers';
import {protect} from "../middleware/authMiddleware";

const router = express.Router()

router.route('/').post(registerUser).get(protect, allUsers);
router.post('/login', authUser)

export default router;