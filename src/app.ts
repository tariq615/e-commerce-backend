import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import express from 'express';
import cors from 'cors';
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";



connectDB();
const port = process.env.PORT || 3000;

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, //which frontend is allowed
    credentials: true, // for allowing the cookies and authentication
  })
);
app.use(express.json({ limit: "16kb" })); // for accepting the data from (Apis, axios, fetch, form, get post etc)


// import routes
import userRouter from './routes/user.route.js';

// routes declaration
app.use('/api/v1/user', userRouter);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})