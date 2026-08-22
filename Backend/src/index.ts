import cors from "cors";
import express from "express";

const app = express();

app.use(express.json());
app.use(cors());
const PORT = (process.env.PORT as number | string) || 3000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
