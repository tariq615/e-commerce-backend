import { NextFunction, Request, Response } from "express";
import { NewUserRequestBody } from "../types/types.js";
import { userModel } from "../models/user.model.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

const newUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { _id, name, email, photo, gender, dob } = req.body;

    let user = await userModel.findById(_id);

    if (user) {
      res.status(200).json({
        success: true,
        message: `welcome ${user.name}`,
      });
    }

    if (!_id || !name || !email || !photo || !gender || !dob) {
      next(new ErrorHandler("provide all fields", 400));
    }

    user = await userModel.create({
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

const getAllUsers = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await userModel.find({});

    res.status(200).json({
      success: true,
      users,
    });
  }
);

const getUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await userModel.findById(id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  }
)

const deleteUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await userModel.findByIdAndDelete(id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  })
export { newUser, getAllUsers, getUser, deleteUser };
