import { Router } from "express";
import {
  newProduct,
  getLatestProducts,
  getAllCategories,
  getAdminProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} from "../controllers/product.controller.js";
import { singleUpload } from "../middlewares/multer.js";
import { adminOnly } from "../middlewares/auth.js";

const router = Router();

router.route("/new").post(adminOnly, singleUpload, newProduct);

router.route("/latest").get(getLatestProducts);

router.route("/categories").get(getAllCategories);

router.route("/admin-products").get(adminOnly, getAdminProducts);

router.route("/all").get(searchProducts)

router.route("/:id").get(getSingleProduct).put(adminOnly, singleUpload, updateProduct).delete(adminOnly, deleteProduct);

export default router;
