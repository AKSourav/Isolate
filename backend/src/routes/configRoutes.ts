import { addKubeConfig, listKubeConfig } from "../controllers/configControllers";
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
const router = Router()

router.route('/kubeconfig').post(protect,addKubeConfig).get(protect, listKubeConfig);

export default router;