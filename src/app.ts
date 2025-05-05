import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import express from 'express';
import cors from 'cors';
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import Stripe from "stripe";
import NodeCache from "node-cache";
import morgan from "morgan";


const port = process.env.PORT || 3000;
const stripeKey = process.env.STRIPE_KEY || "";

connectDB();

export const stripe = new Stripe(stripeKey);
export const myCache = new NodeCache();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, 
    credentials: true, 
  })
);
app.use(express.json({ limit: "16kb" })); 
app.use("/uploads", express.static("uploads"));
app.use(morgan("dev"));


// import routes
import userRouter from './routes/user.route.js';
import productRouter from './routes/product.routes.js';
import orderRouter from './routes/order.route.js';
import paymentRouter from './routes/payment.route.js';
import statRouter from './routes/stat.route.js';

// routes declaration
app.use('/api/v1/user', userRouter);
app.use('/api/v1/product', productRouter);
app.use('/api/v1/order', orderRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/dashboard', statRouter);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})