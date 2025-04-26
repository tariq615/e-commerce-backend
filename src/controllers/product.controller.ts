import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { productModel } from "../models/product.model.js";
import { rm } from "fs";
import { NewProductRequestBody } from "../types/user.types.js";

const newProduct = TryCatch(
  async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, price, stock, category } = req.body;
    const image = req.file?.path;

    if (!image) return next(new ErrorHandler("Image is required", 400));

    if (!name || !price || !stock || !category) {
      rm(image, (err) => {
        console.log("deleted");
      });
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

const getLatestProducts = TryCatch(async (req, res, next) => {
  const products = await productModel.find({}).sort({ createdAt: -1 }).limit(5);

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getAllCategories = TryCatch(async (req, res, next) => {
  const categories = await productModel.distinct("category"); // it will make easy to get all categories rather than using find and then map to get all categories.

  return res.status(200).json({
    success: true,
    message: "Categories fetched successfully",
    categories,
  });
});

const getAdminProducts = TryCatch(async (req, res, next) => {
  const products = await productModel.find({});

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const product = await productModel.findById(id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  return res.status(200).json({
    success: true,
    message: "Product fetched successfully",
    product,
  });
});

const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const product = await productModel.findById(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const { name, price, stock, category } = req.body;
  const image = req.file?.path;

  const oldImage = product.image;

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;
  if (image) product.image = image;

  await product.save(); // ✅ await the save

  if (image) {
    rm(oldImage, (err) => {
      if (err) console.error("Failed to delete old image:", err);
      else console.log("Old image deleted successfully");
    });
  }

  return res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

const deleteProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const product = await productModel.findById(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const image = product.image;
  const deleted = await productModel.findByIdAndDelete(id);
  if (!deleted) return next(new ErrorHandler("Product deletion failed", 500));

  rm(image, (err) => {
    if (err) console.error("Failed to delete image:", err);
    else console.log("Image deleted successfully");
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

export {
  newProduct,
  getLatestProducts,
  getAllCategories,
  getAdminProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
