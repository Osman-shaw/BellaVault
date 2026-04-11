const { env } = require("../config/env");
const { connectDatabase } = require("../config/database");
const { ensureDefaultTenantAndBackfill } = require("../services/tenantBootstrap.service");
const { createApp } = require("./app");

async function bootstrap() {
  await connectDatabase(env.mongoUri);
  await ensureDefaultTenantAndBackfill();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
