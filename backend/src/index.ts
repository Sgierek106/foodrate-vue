import "dotenv/config";
import path from "path";
import fs from "fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { initializeDatabase } from "./database";
import { PHOTOS_DIR, ensurePhotosDir } from "./photos";
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
    await server.register(multipart, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    });

    // Initialize database and photo storage
    await initializeDatabase();
    ensurePhotosDir();

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

    // Serve uploaded rating photos (public - the app is family-only)
    server.get("/api/photos/*", async (request, reply) => {
      const name = decodeURIComponent((request.params as any)["*"]);
      // Only allow plain file names (no path traversal)
      if (!name || name.includes("/") || name.includes("\\")) {
        return reply.code(400).send({ error: "Invalid photo name" });
      }
      const filePath = path.join(PHOTOS_DIR, name);
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: "Photo not found" });
      }
      return reply.type("image/jpeg").send(fs.createReadStream(filePath));
    });

    // Health check endpoint
    server.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Start server
    const port = parseInt(process.env.PORT || "3001");
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
