import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { productModel } from "../models/product.model.js";

const newProduct = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, price, stock, category } = req.body;
    const image = req.file?.path;

    if (!name || !price || !stock || !category || !image) {
      return next(new ErrorHandler("provide all fields", 400));
    }

    const product = await productModel.create({
      name,
      price,
      stock,
      category,
      image,
    });

    if (!product) {
      return next(new ErrorHandler("Product creation failed", 500));
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  }
);

export {newProduct}