import "./config/load-env.js";
import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";

const port = Number(process.env.PORT) || 8000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on ${port}`);
});

connectToMongoDb()
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err: unknown) => {
    console.error("MongoDB connection failed:", err);
  });
