import express from "express";
import db from "./startup/db";
import routes from "./startup/routes";
import server from "./startup/server";

const app = express();

db();
routes(app);
server(app);
