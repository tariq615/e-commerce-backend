import { NextFunction, Request, Response } from "express";
import { redis, redisTTL } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { productModel } from "../models/product.model.js";
import { reviewModel } from "../models/review.model.js";
import { userModel } from "../models/user.model.js";
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { findAverageRatings, invalidateCache } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";

const getLatestProducts = TryCatch(async (req, res, next) => {
  let products;

  products = await redis.get("latest-products");

  if (products) products = JSON.parse(products);
  else {
    products = await productModel.find({}).sort({ createdAt: -1 }).limit(5);
    await redis.setex("latest-products", redisTTL, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;

  categories = await redis.get("categories");

  if (categories) categories = JSON.parse(categories);
  else {
    categories = await productModel.distinct("category"); // it will make easy to get all categories rather than using find and then map to get all categories.
    await redis.setex("categories", redisTTL, JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    message: "Categories fetched successfully",
    categories,
  });
});

const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;

  products = await redis.get("admin-products");

  if (products) products = JSON.parse(products);
  else {
    products = await productModel.find({});
    await redis.setex("admin-products", redisTTL, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
  });
});

const getSingleProduct = TryCatch(async (req, res, next) => {
  let product;
  const { id } = req.params;
  const key = `product-${id}`;

  product = await redis.get(key);
  if (product) product = JSON.parse(product);
  else {
    product = await productModel.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }
    await redis.setex(key, redisTTL, JSON.stringify(product));
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
    const { name, price, stock, category, description } = req.body;
    const images = req.files as Express.Multer.File[] | undefined;

    if (!images) return next(new ErrorHandler("Image is required", 400));

    if (images.length < 1) {
      return next(new ErrorHandler("At least one image is required", 400));
    }

    if (images.length > 5) {
      return next(new ErrorHandler("Maximum 5 images are allowed", 400));
    }

    if (!name || !price || !stock || !category || !description) {
      return next(new ErrorHandler("provide all fields", 400));
    }

    const imageURL = await uploadToCloudinary(images);
    // console.log(imageURL);

    const product = await productModel.create({
      name,
      description,
      price,
      stock,
      category,
      images: imageURL,
    });

    if (!product) {
      return next(new ErrorHandler("Product creation failed", 500));
    }

    await invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
    });
  }
);

const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const product = await productModel.findById(id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const { name, price, stock, category, description } = req.body;

  const images = req.files as Express.Multer.File[] | undefined;

  if (images && images.length > 0) {
    const imageUrl = await uploadToCloudinary(images);

    const oldImageIds = product.images.map((img) => img.public_id);

    await deleteFromCloudinary(oldImageIds);

    product.images = imageUrl; // Update the images with new ones
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;
  if (description) product.description = description;

  await product.save(); // ✅ await the save

  await invalidateCache({ product: true, productId: id, admin: true });

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

  const imgIds = product.images.map((img) => img.public_id);

  await deleteFromCloudinary(imgIds);

  const deleted = await product.deleteOne();

  if (!deleted) return next(new ErrorHandler("Product deletion failed", 500));

  await invalidateCache({ product: true, productId: id, admin: true });

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

    const key = `prducts-${search}-${sort}-${category}-${price}-${page}`;

    let products;
    let totalPage;

    const cachedData = await redis.get(key);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      totalPage = data.totalPage;
      products = data.products;
    } else {
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

      const filteredOnlyProductPromise = productModel.find(baseQuery);

      const [productsFetched, filteredOnlyProduct] = await Promise.all([
        productsPromise,
        filteredOnlyProductPromise,
      ]);

      products = productsFetched;
      totalPage = Math.ceil(filteredOnlyProduct.length / limit);

      await redis.setex(key, 30, JSON.stringify({ products, totalPage }));
    }

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products,
      totalPage,
    });
  }
);

const allReviewsOfProduct = TryCatch(async (req, res, next) => {
  const productId = req.params.id;
  if (!productId) {
    return next(new ErrorHandler("Product ID is required", 400));
  }
  let reviews;
  const key = `reviews-${productId}`;

  reviews = await redis.get(key);

  if (reviews) reviews = JSON.parse(reviews);
  else {
  reviews = await reviewModel
    .find({
      product: productId,
    })
    .populate("user", "name photo")
    .sort({ updatedAt: -1 });

  await redis.setex(key, redisTTL, JSON.stringify(reviews));
  }

  return res.status(200).json({
    success: true,
    reviews,
  });
});

const newReview = TryCatch(async (req, res, next) => {
  const user = await userModel.findById(req.query.id);
  if (!user) return next(new ErrorHandler("Not Logged In", 404));

  const product = await productModel.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const { comment, rating } = req.body;

  if (!rating) {
    return next(new ErrorHandler("Please provide rating", 400));
  }

  if (rating < 1 || rating > 5) {
    return next(new ErrorHandler("Rating must be between 1 and 5", 400));
  }

  const alreadyReviewed = await reviewModel.findOne({
    user: user._id,
    product: product._id,
  });

  if (alreadyReviewed) {
    if (comment) alreadyReviewed.comment = comment;
    alreadyReviewed.rating = rating;

    await alreadyReviewed.save();
  } else {
    const review = await reviewModel.create({
      user: user._id,
      product: product._id,
      comment,
      rating,
    });

    if (!review) {
      return next(new ErrorHandler("Review creation failed", 500));
    }
  }

  const { ratings, numOfReviews } = await findAverageRatings(product._id);

  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
    review: true,
  });

  return res.status(alreadyReviewed ? 200 : 201).json({
    success: true,
    message: alreadyReviewed ? "Review Update" : "Review Added",
  });
});

const deleteReview = TryCatch(async (req, res, next) => {
  const user = await userModel.findById(req.query.id);

  if (!user) return next(new ErrorHandler("Not Logged In", 404));

  const review = await reviewModel.findById(req.params.id);
  if (!review) return next(new ErrorHandler("Review Not Found", 404));

  const isAuthenticUser = review.user.toString() === user._id.toString();

  if (!isAuthenticUser) return next(new ErrorHandler("Not Authorized", 401));

  await review.deleteOne();

  const product = await productModel.findById(review.product);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const { ratings, numOfReviews } = await findAverageRatings(product._id);

  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Review Deleted",
  });
});

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
  allReviewsOfProduct,
  deleteProduct,
  deleteReview,
  getAdminProducts,
  getAllCategories,
  getLatestProducts,
  getSingleProduct,
  newProduct,
  newReview,
  searchProducts,
  updateProduct
};

