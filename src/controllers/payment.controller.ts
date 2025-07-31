import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { couponModel } from "../models/coupon.model.js";
import { productModel } from "../models/product.model.js";
import { userModel } from "../models/user.model.js";
import { orderItemsType, shippingInfoType } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";

const createPaymentIntent = TryCatch(async (req, res, next) => {
   const { id } = req.query;

  const user = await userModel.findById(id).select("name");

  if (!user) return next(new ErrorHandler("Please login first", 401));

  const {
    items,
    shippingInfo,
    coupon,
  }: {
    items: orderItemsType[];
    shippingInfo: shippingInfoType | undefined;
    coupon: string | undefined;
  } = req.body;

  if (!items) return next(new ErrorHandler("Please send items", 400));

  if (!shippingInfo)
    return next(new ErrorHandler("Please send shipping info", 400));

  let discountAmount = 0;

  if (coupon) {
    const discount = await couponModel.findOne({ code: coupon });
    if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));
    discountAmount = discount.amount;
  }

  const productIDs = items.map((item) => item.productId);

  const products = await productModel.find({
    _id: { $in: productIDs },
  });

  const subtotal = products.reduce((prev, curr) => {
    const item = items.find((i) => i.productId === curr._id.toString());
    if (!item) return prev;
    return curr.price * item.quantity + prev;
  }, 0);

  const tax = subtotal * 0.18;

  const shipping = subtotal > 1000 ? 0 : 200;

  const total = Math.floor(subtotal + tax + shipping - discountAmount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: total * 100,
    currency: "pkr",
    description: "Bin Iqbal's store",
    shipping: {
      name: user.name,
      address: {
        line1: shippingInfo.address,
        postal_code: shippingInfo.pinCode.toString(),
        city: shippingInfo.city,
        state: shippingInfo.state,
        country: shippingInfo.country,
      },
    },
  });

  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

const newCoupon = TryCatch(async (req, res, next) => {
  const { code, amount } = req.body;

  if (!code || !amount) {
    return next(new ErrorHandler("Please enter all fields", 400));
  }

  const coupon = await couponModel.create({
    code,
    amount,
  });

  if (!coupon) {
    return next(new ErrorHandler("Coupon not created", 500));
  }

  res.status(201).json({
    success: true,
    message: `Coupon  ${code} created successfully`,
  });
});

const applyDiscount = TryCatch(async (req, res, next) => {
  const { coupon } = req.query;

  const discount = await couponModel.findOne({ code: coupon });

  if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));

  res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

const allCoupons = TryCatch(async (req, res, next) => {
  const coupons = await couponModel.find({});

  res.status(200).json({
    success: true,
    coupons,
  });
});

const getCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await couponModel.findById(id);

  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  res.status(200).json({
    success: true,
    coupon,
  });
});

const updateCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const { code, amount } = req.body;

  const coupon = await couponModel.findById(id);

  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  if (code) coupon.code = code;
  if (amount) coupon.amount = amount;

  await coupon.save();

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} Updated Successfully`,
  });
});

const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await couponModel.findByIdAndDelete(id);

  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} Deleted Successfully`,
  });
});

export {
  createPaymentIntent,
  applyDiscount,
  newCoupon,
  allCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
};
