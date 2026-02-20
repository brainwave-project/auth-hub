import express from "express";
import router from "./routes/index.js";
import { setupSwagger } from "./config/swagger.js";
import { loadConfig } from "./config/env.js";
import { registerHealthEndpoints } from "./health/index.js";

export async function startServer() {
  const config = loadConfig();

  const app = express();

  app.use(express.json());

  registerHealthEndpoints(app);

  app.use("/api", router);

  setupSwagger(app);

  app.listen(config.port, () => {
    console.log(`AuthHub running on PORT ${config.port}`);
    console.log(
      `Swagger docs available at PORT ${config.port}`
    );
  });
}