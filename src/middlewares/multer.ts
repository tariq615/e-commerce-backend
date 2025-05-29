import multer from "multer";
import { v4 as uuid } from "uuid";


export const singleUpload = multer().single("image");
export const multiUpload = multer().array("images", 5);
