import { Router } from "express";
import { newUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/new").post(newUser);

export default router;