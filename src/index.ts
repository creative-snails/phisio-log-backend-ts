import express from "express";
import db from "./startup/db";
import routes from "./startup/routes";

const app = express();

routes(app);
db();

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
