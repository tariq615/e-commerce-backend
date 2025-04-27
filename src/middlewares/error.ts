import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/utility-class.js";
import { ControllerType } from "../types/types.js";

export const errorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.message ||= "internal server error";
  err.statusCode ||= 500;

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const TryCatch =
  (func: ControllerType) => // jo bhi func aye ga wo is expres ke req, res ,next type ka hoga 
  (req: Request, res: Response, next: NextFunction) => { // idher hum ne ye param pass kiye 
    Promise.resolve(func(req, res, next)).catch(next); // idher humne bataya ke trycatch ke andar first walaa func aya ha and usko second wale func ke params de diya , Take my controller, and give me back a new one that automatically handles errors.
};
