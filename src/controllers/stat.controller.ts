import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { orderModel } from "../models/order.model.js";
import { productModel } from "../models/product.model.js";
import { userModel } from "../models/user.model.js";
import {
  calculatePercentage,
  getChartData,
  getCreatedAtFilter,
} from "../utils/features.js";

const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats;

  const key = "admin-stats";
  if (myCache.has(key)) {
    stats = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };

    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = productModel.find(
      getCreatedAtFilter(thisMonth.start, thisMonth.end)
    );

    const lastMonthProductsPromise = productModel.find(
      getCreatedAtFilter(lastMonth.start, lastMonth.end)
    );

    const thisMonthUsersPromise = userModel.find(
      getCreatedAtFilter(thisMonth.start, thisMonth.end)
    );

    const lastMonthUsersPromise = userModel.find(
      getCreatedAtFilter(lastMonth.start, lastMonth.end)
    );

    const thisMonthOrdersPromise = orderModel.find(
      getCreatedAtFilter(thisMonth.start, thisMonth.end)
    );

    const lastMonthOrdersPromise = orderModel.find(
      getCreatedAtFilter(lastMonth.start, lastMonth.end)
    );

    const orderRevenueCount = orderModel.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]);

    const sixMonthsStat = orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: sixMonthsAgo,
            $lte: today,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          monthlyTotal: { $sum: "$total" },
          monthlyCount: { $sum: 1 },
        },
      },
    ]);

    const categoryStats = productModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const latestTransaction = orderModel
      .find({})
      .sort({ createdAt: -1 })
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthProducts,
      lastMonthProducts,
      thisMonthUsers,
      lastMonthUsers,
      thisMonthOrders,
      lastMonthOrders,
      usersCount,
      productsCount,
      ordersRevCount,
      sixMonthStats,
      catStats,
      femaleCounts,
      latestsTransaction,
    ] = await Promise.all([
      thisMonthProductsPromise,
      lastMonthProductsPromise,
      thisMonthUsersPromise,
      lastMonthUsersPromise,
      thisMonthOrdersPromise,
      lastMonthOrdersPromise,
      userModel.countDocuments(),
      productModel.countDocuments(),
      orderRevenueCount,
      sixMonthsStat,
      categoryStats,
      userModel.countDocuments({ gender: "female" }),
      latestTransaction,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const lastMonthRevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changetoPercentage = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      users: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      products: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      orders: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    const totals = {
      revenue: ordersRevCount[0]?.revenue || 0,
      users: usersCount,
      products: productsCount,
      orders: ordersRevCount[0]?.count || 0,
    };

    const orderMonthCount = new Array(6).fill(0);
    const orderMonthRevenue = new Array(6).fill(0);

    sixMonthStats.forEach((order) => {
      const monthIndex = (today.getMonth() - (order._id - 1) + 12) % 12;
      const arrayIndex = 5 - monthIndex;

      if (arrayIndex >= 0 && arrayIndex < 6) {
        orderMonthCount[arrayIndex] = order.monthlyCount;
        orderMonthRevenue[arrayIndex] = order.monthlyTotal;
      }
    });

    const categoryCount: Record<string, number>[] = catStats.map((cat) => ({
      [cat._id]: Math.round((cat.count / productsCount) * 100),
    }));

    const userRatio = {
      male: usersCount - femaleCounts,
      female: femaleCounts,
    };

    const modifiedTransaction = latestsTransaction.map((item) => ({
      _id: item._id,
      discount: item.discount,
      amount: item.total,
      quantity: item.orderItems.length,
      status: item.status,
    }));

    stats = {
      changetoPercentage,
      totals,
      chart: {
        order: orderMonthCount,
        revenue: orderMonthRevenue,
      },
      categoryCount,
      userRatio,
      modifiedTransaction,
    };

    myCache.set(key, JSON.stringify(stats));
  }

  res.status(200).json({
    success: true,
    stats,
    message: "Dashboard stats",
  });
});

const getPieCharts = TryCatch(async (req, res, next) => {
  let charts;

  const key = "admin-pie-charts";

  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const productCategories = productModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const allOrder = orderModel
      .find({})
      .select(["total", "discount", "tax", "shippingCharges"]);

    const [
      processingOrder,
      shippedOrder,
      deliveredOrder,
      categoriesCount,
      outofStock,
      allOrders,
      allUsers,
      adminUsers,
      customerUsers,
    ] = await Promise.all([
      orderModel.countDocuments({ status: "Processing" }),
      orderModel.countDocuments({ status: "Shipped" }),
      orderModel.countDocuments({ status: "Delivered" }),
      productCategories,
      productModel.countDocuments({ stock: 0 }),
      allOrder,
      userModel.find({}).select(["dob"]),
      userModel.countDocuments({ role: "admin" }),
      userModel.countDocuments({ role: "user" }),
    ]);

    const orderFullfillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliveredOrder,
    };

    const categories: Record<string, number>[] = categoriesCount.map(
      (item) => ({
        [item._id]: item.count,
      })
    );

    //counting total from the categories count
    const totalProducts = categoriesCount.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const stockAvailability = {
      inStock: totalProducts - outofStock,
      outofStock,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + order.total || 0,
      0
    );

    const discount = allOrders.reduce(
      (prev, order) => prev + order.discount || 0,
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + order.shippingCharges || 0,
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + order.tax || 0, 0);

    const marketingCost = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - discount - productionCost - burnt - marketingCost;

    const revenueDistribution = {
      netMargin,
      discount,
      productionCost,
      burnt,
      marketingCost,
    };

    const usersAgeGroup = {
      teen: allUsers.filter((i) => i.age < 20).length,
      aduld: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
      old: allUsers.filter((i) => i.age >= 40).length,
    };

    const adminCustomerRatio = {
      admin: adminUsers,
      users: customerUsers,
    };
    charts = {
      orderFullfillment,
      categories,
      stockAvailability,
      netMargin,
      usersAgeGroup,
      adminCustomerRatio,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  res.status(200).json({
    sucess: true,
    charts,
    message: "fetched successfully",
  });
});

const getBarCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-charts";

  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(today.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const sixMonthsProductStat = productModel.aggregate([
      {
        $match: getCreatedAtFilter(sixMonthsAgo, today),
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const sixMonthsUserStat = userModel.aggregate([
      {
        $match: getCreatedAtFilter(sixMonthsAgo, today),
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const twelveMonthsOrderStat = orderModel.aggregate([
      {
        $match: getCreatedAtFilter(twelveMonthsAgo, today),
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const [products, users, orders] = await Promise.all([
      sixMonthsProductStat,
      sixMonthsUserStat,
      twelveMonthsOrderStat,
    ]);

    const monthlyProduct = getChartData({
      length: 6,
      today,
      docArr: products,
      valueKey: "count",
    });

    const monthlyUsers = getChartData({
      length: 6,
      today,
      docArr: users,
      valueKey: "count",
    });

    const monthlyOrder = getChartData({
      length: 12,
      today,
      docArr: orders,
      valueKey: "count",
    });

    charts = {
      product: monthlyProduct,
      user: monthlyUsers,
      order: monthlyOrder,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  
  res.status(200).json({
    success: true,
    charts,
    message: "fetched",
  });
});

const getLineCharts = TryCatch(async (req, res, next) => {

});
export { getDashboardStats, getBarCharts, getPieCharts, getLineCharts };
