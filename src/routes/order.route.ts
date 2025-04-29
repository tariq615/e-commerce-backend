import { Router } from "express";
import { newOrder, myOrders, allOrders, getSingleOrder, processOrder, deleteOrder } from "../controllers/order.controller.js";
import { adminOnly } from "../middlewares/auth.js";

const router = Router();

router.route("/new").post(newOrder)

router.route("/my").get(myOrders);

router.route("/all").get(adminOnly ,allOrders);

router.route("/:id").get(getSingleOrder).put(adminOnly ,processOrder).delete(adminOnly ,deleteOrder);

export default router;
