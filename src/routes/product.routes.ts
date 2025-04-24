import { Router } from "express";
import { newProduct } from "../controllers/product.controller.js";
import { singleUpload } from "../middlewares/multer.js";

const router = Router();

router.route("/new").post(singleUpload ,newProduct);
export default router;