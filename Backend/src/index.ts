// require('dotenv').config({path: './env'})
import dotenv from "dotenv";
import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";
dotenv.config({
  path: "./.env",
});

connectToMongoDb()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.log("MONGO db connection failed !!! ", err);
  });
