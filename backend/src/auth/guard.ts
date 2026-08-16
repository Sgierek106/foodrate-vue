import { FastifyInstance } from "fastify";
import { getSession } from "./session";

const SESSION_COOKIE = "foodrate_session";

/**
 * Rejects any request without a valid session cookie.
 * Call this directly on the instance that the protected routes are
 * registered on (hooks only apply to the same or child contexts).
 */
export function requireAuth(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE];
    const session = await getSession(sessionId);
    if (!session) {
      return reply.code(401).send({ error: "Not signed in" });
    }
    // Expose the signed-in user to route handlers
    (request as any).sessionUser = session.user;
  });
}
