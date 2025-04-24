import { NextFunction, Request, Response } from "express";
import { NewUserRequestBody } from "../types/user.types.js";
import { userModel } from "../models/user.model.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

const newUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    next(new ErrorHandler("This is test error", 402));
    const { _id, name, email, photo, gender, dob } = req.body;

    if (!_id || !name || !email || !photo) {

      res.status(400).json({
        status: "fail",
        message: "Please provide all required fields",
      });
    }

    const user = await userModel.create({
      _id,
      name,
      email,
      photo,
      gender,
      dob: new Date(dob),
    });

    res.status(201).json({
      status: "success",
      message: "User created successfully",
    });
  }
);

export { newUser };
