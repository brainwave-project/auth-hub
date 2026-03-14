import { startServer } from "./app.js";

startServer().catch((err) => {
  console.error("AuthHub failed to start", err);
  process.exit(1);
});