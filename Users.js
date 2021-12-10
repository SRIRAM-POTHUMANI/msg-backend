import Mongoose from "mongoose";
const { Schema } = Mongoose;
const userSchema = new Schema({
  name : String,
  phone : String,
  email : String,
  password : String
});

export default Mongoose.model("users", userSchema, "users");
