import e, { Router } from "express";
import { allCoupons, applyDiscount, newCoupon, getCoupon, updateCoupon, deleteCoupon} from "../controllers/payment.controller.js";
import { adminOnly } from "../middlewares/auth.js";

const router = Router();

router.route("/discount").get(applyDiscount);

router.route("/coupon/new").post(adminOnly, newCoupon);

router.route("/coupon/all").get(adminOnly, allCoupons);

router.route("/coupon/:id")
.get(adminOnly, getCoupon)
.put(adminOnly, updateCoupon)
.delete(adminOnly, deleteCoupon);

export default router;