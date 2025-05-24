import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { couponModel } from "../models/coupon.model.js";
import ErrorHandler from "../utils/utility-class.js";

const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount) {
    return next(new ErrorHandler("Please enter amount ", 400));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "pkr"
  })

  res.status(201).json({
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
