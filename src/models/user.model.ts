import mongoose from "mongoose";
import validator from "validator";

interface IUser extends Document{
  _id: string;
  name: string;
  email: string;
  photo: string;
  role: "user" | "admin";
  gender: "male" | "female";
  dob: Date;
  createdAt: Date;
  updatedAt: Date;
  //   Virtual Attribute
  age: number;
}

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, "User ID is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email already exists"],
      validate: validator.default.isEmail
    },
    photo: {
      type: String,
      required: [true, "Photo URL is required"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "gender is required"],
    },
    dob: {
      type: Date,
      required: [true, "Date of Birth is required"],
    },
  },
  { timestamps: true }
);

userSchema.virtual("age").get(function (){
  const today = new Date();
  const dob = this.dob;
  let age = today.getFullYear() - dob.getFullYear();

  if(today.getMonth() < dob.getMonth() || today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate()){
    age-- ;
  }

  return age;
})

export const userModel = mongoose.model<IUser>("User", userSchema);