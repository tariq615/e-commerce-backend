import mongoose from "mongoose";

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
