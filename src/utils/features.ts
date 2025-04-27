import mongoose from "mongoose";
import { InvalidateCacheProps } from "../types/types.js";
import { productModel } from "../models/product.model.js";
import { myCache } from "../app.js";

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
