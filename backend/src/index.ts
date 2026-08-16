import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { initializeDatabase } from "./database";
import familyMembersRoutes from "./routes/familyMembers";
import foodRatingsRoutes from "./routes/foodRatings";
import placesRoutes from "./routes/places";
import googleMapsRoutes from "./routes/googleMaps";
import authRoutes from "./routes/auth";
import { requireAuth } from "./auth/guard";

const server = Fastify({
  logger: true,
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: true,
      credentials: true,
    });
    await server.register(cookie);

    // Initialize database
    await initializeDatabase();

    // Auth routes are public (the login flow itself)
    await server.register(authRoutes, { prefix: "/api" });

    // All data routes are wrapped in a plugin that requires a valid session
    await server.register(async (protectedApi) => {
      requireAuth(protectedApi);
      await protectedApi.register(familyMembersRoutes, { prefix: "/api" });
      await protectedApi.register(foodRatingsRoutes, { prefix: "/api" });
      await protectedApi.register(placesRoutes, { prefix: "/api" });
      await protectedApi.register(googleMapsRoutes, { prefix: "/api" });
    });

    // Health check endpoint
    server.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Start server
    const port = parseInt(process.env.PORT || "3000");
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  server.log.info(`${signal} received, shutting down gracefully`);
  // Force-exit if graceful shutdown hangs (e.g. stuck in-flight request)
  const forceExit = setTimeout(() => {
    server.log.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();
  try {
    await server.close();
    server.log.info("Server closed");
    process.exit(0);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
