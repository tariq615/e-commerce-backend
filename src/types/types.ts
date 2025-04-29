import { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody {
  _id: string;
  name: string;
  email: string;
  photo: string;
  gender: "male" | "female";
  dob: Date;
}

export interface NewProductRequestBody {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

export type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;


export type SearchRequestQuery = {
  search?: string;
  price?: string;
  category?: string;
  sort?: string;
  page?: string;
};

export interface BaseQuery {
  name?: {
    $regex: string;
    $options: string;
  };
  price?: { $lte: number };
  category?: string;
}

export type InvalidateCacheProps = {
  product?: boolean,
  order?: boolean,
  admin?: boolean
}

export type shippingInfoType = {
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: number;
  phoneNo: number;
}

export type orderItemsType = {
  name: string;
  photo: string;
  price: number;
  quantity: number;
  productId: string;
}

export interface NewOrderRequestBody {
  shippingInfo: shippingInfoType,
  user: string,
  subtotal: number,
  tax: number,
  shippingCharges: number,
  discount: number,
  total: number,
  status: string,
  orderItems: orderItemsType[],
}