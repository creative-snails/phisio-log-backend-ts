import mongoose from "mongoose";
import config from "../config";

export default () => {
  mongoose
    .connect(`mongodb://${config.MONGO_HOST}:${config.MONGO_PORT}/${config.MONGO_DB}`)
    .then(() => {
      console.log("Connected to MongoDB...");
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err);
    });
};
