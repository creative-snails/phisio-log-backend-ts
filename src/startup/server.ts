import { Express } from "express";

export default (app: Express) => {
  const port = process.env.PORT || 4000;
  const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  process.on("unhandledRejection", (err: Error) => {
    console.log("Unhandled Rejection! Shutting down...");
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on("uncaughtException", (err: Error) => {
    console.log("Uncaught Exception! Shutting down...");
    console.error(err.name, err.message);
    process.exit(1);
  });

  return server;
};
