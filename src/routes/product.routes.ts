import { Router } from "express";
import {
  allReviewsOfProduct,
  deleteProduct,
  deleteReview,
  getAdminProducts,
  getAllCategories,
  getLatestProducts,
  getSingleProduct,
  newProduct,
  newReview,
  searchProducts,
  updateProduct
} from "../controllers/product.controller.js";
import { adminOnly } from "../middlewares/auth.js";
import { multiUpload } from "../middlewares/multer.js";

const router = Router();

router.route("/new").post(adminOnly, multiUpload, newProduct);

router.route("/latest").get(getLatestProducts);

router.route("/categories").get(getAllCategories);

router.route("/admin-products").get(adminOnly, getAdminProducts);

router.route("/all").get(searchProducts)

router.route("/:id").get(getSingleProduct).put(adminOnly, multiUpload, updateProduct).delete(adminOnly, deleteProduct);

router.route("/reviews/:id").get(allReviewsOfProduct)
router.route("/review/new/:id").post(newReview);
router.route("/review/:id").delete(deleteReview);

export default router;
