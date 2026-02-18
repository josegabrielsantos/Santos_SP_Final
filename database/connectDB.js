import mongoose from "mongoose";
import { watchMongoChanges } from "../elastic/elastic_client.js";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        watchMongoChanges();
    }catch (error){
        console.log(`Error connection to mongoDB: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB