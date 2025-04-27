import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import express from 'express';
import cors from 'cors';
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";

connectDB();

export const myCache = new NodeCache()
const port = process.env.PORT || 3000;

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, 
    credentials: true, 
  })
);
app.use(express.json({ limit: "16kb" })); 
app.use("/uploads", express.static("uploads"));

// import routes
import userRouter from './routes/user.route.js';
import productRouter from './routes/product.routes.js';

// routes declaration
app.use('/api/v1/user', userRouter);
app.use('/api/v1/product', productRouter);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})