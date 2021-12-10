import mongoose from "mongoose";

const msgSchema = mongoose.Schema({
    message: String,
    name: String,
    toname: String,
    timestamp: String,
    recieved: Boolean,
})

export default mongoose.model("messageContents",msgSchema);
