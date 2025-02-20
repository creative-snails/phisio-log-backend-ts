import cors from "cors";
import express, { Express } from "express";
import healthRecords from "../routes/healthRecords.routes";

export default (app: Express) => {
  app.use(cors());
  app.use(express.json()); // parse JSON bodies
  app.use("/api/health-records", healthRecords);
};
