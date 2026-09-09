import './config/load-env.js';
import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";

connectToMongoDb()
  .then(() => {
    app.listen(Number(process.env.PORT) || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.log("MONGO db connection failed !!! ", err);
  });
