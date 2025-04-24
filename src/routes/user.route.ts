import { Router } from "express";
import { newUser, getAllUsers, getUser, deleteUser} from "../controllers/user.controller.js";
import { adminOnly } from "../middlewares/auth.js";

const router = Router();

router.route("/new").post(newUser);

router.route("/all").get(adminOnly ,getAllUsers);

router.route("/:id").get(adminOnly ,getUser).delete(adminOnly ,deleteUser);

export default router;