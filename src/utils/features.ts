import mongoose from "mongoose";
import { InvalidateCacheProps, orderItemsType } from "../types/types.js";
import { productModel } from "../models/product.model.js";
import { myCache, redis } from "../app.js";
import { reviewModel } from "../models/review.model.js";
import { Redis } from "ioredis";
// import ErrorHandler from "./utility-class.js";

export const findAverageRatings = async (
  productId: mongoose.Types.ObjectId
) => {
  let totalRatings = 0;

  const reviews = await reviewModel.find({ product: productId });

  reviews.forEach((review) => {
    totalRatings += review.rating;
  });

  const averageRatings = Math.floor(totalRatings / reviews.length) || 0;

  return { ratings: averageRatings, numOfReviews: reviews.length };
};

export const connectRedis = (redisURI: string) => {
  const redis = new Redis(redisURI);

  redis.on("connect", () => console.log("Redis connected successfully!"));
  redis.on("error", (e) => console.error("Redis connection error:", e));

  return redis;
};

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
  review,
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (review) {
    await redis.del([`reviews-${productId}`]);
  }

  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "admin-products",
      "categories",
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((id) => productKeys.push(`product-${id}`));

    await redis.del(productKeys);
  }

  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `order-${orderId}`,
      `my-orders-${userId}`,
    ];

    await redis.del(orderKeys);
  }

  if (admin) {
    await redis.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
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

export function getCreatedAtFilter(start: Date, end: Date) {
  return {
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };
}

export const calculatePercentage = (
  thisMonth: number,
  lastMonth: number
): number => {
  if (lastMonth === 0) {
    if (thisMonth === 0) return 0; // No change
    return 100; // Arbitrary 100% growth when last month was 0
  }
  const percentage = (thisMonth / lastMonth) * 100;
  return Number(percentage.toFixed(2));
};

type PropsData = {
  length: number;
  docArr: {
    _id: number;
    [key: string]: number; // string ke key to ha but kis naam se to usko access krne ke liye valuekey assign kr waya
  }[];
  valueKey: string;
  today: Date;
};

export const getChartData = ({
  length,
  docArr,
  today,
  valueKey,
}: PropsData) => {
  const data = new Array(length).fill(0);

  docArr.forEach((order) => {
    const monthIndex = (today.getMonth() - (order._id - 1) + 12) % 12;
    const arrayIndex = length - 1 - monthIndex;

    if (arrayIndex >= 0 && arrayIndex < 12) {
      data[arrayIndex] = order[valueKey];
    }
  });
  return data;
};
//   const data = new Array(length).fill(0);

//   docArr.forEach((order) => {
//     const monthIndex = (today.getMonth() - (order._id - 1) + 12) % 12;
//     const arrayIndex = (length - 1) - monthIndex;

//     if (arrayIndex >= 0 && arrayIndex < length) {
//       data[arrayIndex] = order.monthlyTotal;
//     }
//   });

//   return data;
// };
