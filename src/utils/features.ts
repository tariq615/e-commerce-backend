import mongoose from "mongoose";
import { InvalidateCacheProps, orderItemsType } from "../types/types.js";
import { productModel } from "../models/product.model.js";
import { myCache } from "../app.js";
// import ErrorHandler from "./utility-class.js";

export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}`,
      {
        dbName: "Ecommerce_25",
      }
    );
    console.log("MONGODB Connected !! ", connectionInstance.connection.host);
  } catch (error) {
    console.log("MONGODB connection error", error);
    process.exit(1);
  }
};

export const invalidateCache = async ({
  product,
  order,
  admin,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "admin-products",
      "categories",
    ];

    const products = await productModel.find({}).select("_id");

    products.forEach((product) => {
      productKeys.push(`product-${product._id}`);
    });

    myCache.del(productKeys);
  }

  if (order) {
  }

  if (admin) {
  }
};

export const reduceStock = async (orderItems: orderItemsType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const orderItem = orderItems[i];
    const product = await productModel.findById(orderItem.productId);
    if (!product) throw new Error("Product not found");
    product.stock -= orderItem.quantity;
    await product.save();
  }
};
