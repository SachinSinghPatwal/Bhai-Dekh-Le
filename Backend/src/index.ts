import "./config/load-env.js";
import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";
import { startScrapConsumer } from "./services/RMQ/WorkerManager.js";

const port = Number(process.env.PORT) || 8000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on ${port}`);
});

connectToMongoDb()
  .then(() => {
    startScrapConsumer();
    console.log("MongoDB connected");
  })
  .catch((err: unknown) => {
    console.error("MongoDB connection failed:", err);
  });
