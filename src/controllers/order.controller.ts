import { Request } from "express";
import { redis, redisTTL } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { orderModel } from "../models/order.model.js";
import { NewOrderRequestBody } from "../types/types.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";

const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `my-orders-${user}`;
  let orders;

  orders = await redis.get(key);

  if (orders) orders = JSON.parse(orders);
  else {
    orders = await orderModel.find({ user });
    await redis.setex(key, redisTTL, JSON.stringify(orders));
  }
  res.status(200).json({
    sucess: true,
    orders,
  });
});

const allOrders = TryCatch(async (req, res, next) => {
  const key = "all-orders";

  let orders;

  orders = await redis.get(key);

  if (orders) orders = JSON.parse(orders);
  else {
    orders = await orderModel.find().populate("user", "name");
    await redis.setex(key, redisTTL, JSON.stringify(orders));
  }
  res.status(200).json({
    success: true,
    orders,
  });
});

const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;
  let order;

  order = await redis.get(key);

  if (order) order = JSON.parse(order);
  else {
    order = await orderModel.findById(id).populate("user", "name");

    if (!order) return next(new ErrorHandler("Order not found", 404));

    await redis.setex(key, redisTTL, JSON.stringify(order));
  }
  res.status(200).json({
    success: true,
    order,
  });
});

const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    // console.log(
    //   shippingInfo,
    //   orderItems,
    //   user,
    //   subtotal,
    //   tax,
    //   shippingCharges,
    //   discount,
    //   total
    // );

    if (
      shippingInfo === undefined ||
      orderItems === undefined ||
      user === undefined ||
      subtotal < 0 ||
      tax < 0 ||
      shippingCharges < 0 ||
      discount < 0 ||
      total <= 0
    )
      return next(new ErrorHandler("Please fill all fields", 400));

    const order = await orderModel.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    if (!order) return next(new ErrorHandler("Order not created", 500));

    await reduceStock(orderItems);

    await invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    res.status(201).json({
      success: true,
      message: "order created successfully",
    });
  }
);

const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await orderModel.findById(id);

  if (!order) return next(new ErrorHandler("Order not found", 404));

  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      "Delivered";
      break;
  }

  await order.save();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: id,
  });

  res.status(200).json({
    success: true,
    message: "order processed successfully",
  });
});

const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await orderModel.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.deleteOne();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: id,
  });

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});

export {
  allOrders, deleteOrder, getSingleOrder, myOrders, newOrder, processOrder
};

