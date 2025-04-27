import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { productModel } from "../models/product.model.js";
import { rm } from "fs";
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";

const getLatestProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("latest-products")) {
    products = JSON.parse(myCache.get("latest-products") as string);
  } else {
    products = await productModel.find({}).sort({ createdAt: -1 }).limit(5);
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;
  if (myCache.has("categories")) {
    categories = JSON.parse(myCache.get("categories") as string);
  } else {
    categories = await productModel.distinct("category"); // it will make easy to get all categories rather than using find and then map to get all categories.
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    message: "Categories fetched successfully",
    categories,
  });
});

const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("admin-products")) {
    products = JSON.parse(myCache.get("admin-products") as string);
  } else {
    products = await productModel.find({});
    myCache.set("admin-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  let product;

  if (myCache.has(`product-${id}`)) {
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  } else {
    product = await productModel.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }
    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    message: "Product fetched successfully",
    product,
  });
});

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

    await invalidateCache({ product: true });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  }
);

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

  await invalidateCache({ product: true });

  rm(oldImage, (err) => {
    if (err) console.error("Failed to delete old image:", err);
    else console.log("Old image deleted successfully");
  });

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

  await invalidateCache({ product: true });

  rm(image, (err) => {
    if (err) console.error("Failed to delete image:", err);
    else console.log("Image deleted successfully");
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

const searchProducts = TryCatch(
  async (
    req: Request<{}, {}, {}, SearchRequestQuery>,
    res: Response,
    next: NextFunction
  ) => {
    const { search, sort, category, price } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};
    if (search) {
      baseQuery.name = { $regex: search, $options: "i" };
    }
    if (category) {
      baseQuery.category = category;
    }
    if (price) {
      baseQuery.price = { $lte: Number(price) };
    }

    const productsPromise = await productModel
      .find(baseQuery)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    const [productsFetched, filteredOnlyProduct] = await Promise.all([
      productsPromise,
      productModel.find(baseQuery),
    ]);

    const products = productsFetched;
    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products,
      totalPage,
    });
  }
);

// const generateRandomProducts = async (count: number = 10) => {
//     const products = [];

//     for (let i = 0; i < count; i++) {
//       const product = {
//         name: faker.commerce.productName(),
//         image: "uploads\\7f1c4542-930b-4151-8a6c-8a05b45b1394.jpg",
//         price: faker.commerce.price({ min: 1500, max: 80000, dec: 0 }),
//         stock: faker.commerce.price({ min: 0, max: 100, dec: 0 }),
//         category: faker.commerce.department(),
//         createdAt: new Date(faker.date.past()),
//         updatedAt: new Date(faker.date.recent()),
//         __v: 0,
//       };

//       products.push(product);
//     }

//     await productModel.create(products);

//     console.log({ succecss: true });
//   };

// generateRandomProducts(40)

//   const deleteRandomsProducts = async (count: number = 10) => {
//   const products = await productModel.find({}).skip(2);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     await product.deleteOne();
//   }

//   console.log({ succecss: true });
// };

// deleteRandomsProducts(120)
export {
  newProduct,
  getLatestProducts,
  getAllCategories,
  getAdminProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};
