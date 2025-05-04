import mongoose, { Model, Document } from "mongoose";
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
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "admin-products",
      "categories",
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((id) => productKeys.push(`product-${id}`));

    myCache.del(productKeys);
  }

  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `order-${orderId}`,
      `my-orders-${userId}`,
    ];

    myCache.del(orderKeys);
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

// export const getByDateRange = <T extends Document>(
//   Model: Model<T>,
//   start: Date,
//   end: Date
// ) => Model.find({ createdAt: { $gte: start, $lte: end } });

export const calculatePercentage = (thisMonth: number, lastMonth: number): number => {
  if (lastMonth === 0) {
    if (thisMonth === 0) return 0;     // No change
    return 100;                        // Arbitrary 100% growth when last month was 0
  }
  const percentage = (thisMonth / lastMonth) * 100;
  return Number(percentage.toFixed(2));
};