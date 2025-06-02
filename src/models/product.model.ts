import mongoose from "mongoose";

export interface IProduct {
  name: string;
  images: {
    public_id: string;
    url: string;
  }[];
  price: number;
  stock: number;
  category: string;
  description: string;
  ratings: number;
  // numOfReviews: number;
}

const postSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter Name"],
    },
    images: [
      {
        public_id: {
          type: String,
          required: [true, "Please enter Public ID"],
        },
        url: {
          type: String,
          required: [true, "Please enter URL"],
        },
      },
    ],
    price: {
      type: Number,
      required: [true, "Please enter Price"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter Stock"],
    },
    category: {
      type: String,
      required: [true, "Please enter Category"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please enter Description"],
    },
    ratings: {
      type: Number,
      default: 0,
    },

    // numOfReviews: {
    //   type: Number,
    //   default: 0,
    // },
  },
  {
    timestamps: true,
  }
);

export const productModel = mongoose.model<IProduct>("Product", postSchema);
