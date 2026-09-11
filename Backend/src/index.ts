import './config/load-env.js';
import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";

const port = Number(process.env.PORT) || 8000;

app.listen(port, "0.0.0.0", () => {
  console.log(`⚙️ Server is running at port : ${port}`);
});

connectToMongoDb()
  .then(() => {
    console.log("MongoDB initialization completed");
  })
  .catch((err: unknown) => {
    console.error("MONGO db connection failed !!!", err);
  });
