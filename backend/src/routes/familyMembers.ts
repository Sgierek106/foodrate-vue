import { FastifyInstance } from "fastify";
import { db } from "../database";

export default async function routes(fastify: FastifyInstance) {
  // Get all family members
  fastify.get("/family-members", async () => {
    const { rows } = await db.execute(
      "SELECT * FROM family_members ORDER BY name",
    );
    return rows;
  });

  // Create a family member
  fastify.post("/family-members", async (request, reply) => {
    const body = request.body as { name: string; email: string };

    if (!body.name || typeof body.name !== "string") {
      return reply.code(400).send({ error: "Name is required" });
    }

    if (!body.email || typeof body.email !== "string") {
      return reply.code(400).send({ error: "Email is required" });
    }

    const email = body.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return reply.code(400).send({ error: "A valid email is required" });
    }

    try {
      await db.execute(
        "INSERT INTO family_members (name, email) VALUES (?, ?)",
        [body.name.trim(), email],
      );
      const { rows } = await db.execute(
        "SELECT * FROM family_members WHERE rowid = last_insert_rowid()",
      );
      return reply.code(201).send(rows[0]);
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error creating family member",
      });
      if (error.message?.includes("UNIQUE")) {
        return reply.code(409).send({ error: "Family member already exists" });
      }
      return reply.code(500).send({
        error: error.message || "Failed to create family member",
      });
    }
  });

  // Update a family member
  fastify.put("/family-members/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name: string; email: string };

    if (!body.name || typeof body.name !== "string") {
      return reply.code(400).send({ error: "Name is required" });
    }

    if (!body.email || typeof body.email !== "string") {
      return reply.code(400).send({ error: "Email is required" });
    }

    const email = body.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return reply.code(400).send({ error: "A valid email is required" });
    }

    const { rows } = await db.execute(
      "SELECT * FROM family_members WHERE id = ?",
      [parseInt(id)],
    );

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Family member not found" });
    }

    try {
      await db.execute(
        "UPDATE family_members SET name = ?, email = ? WHERE id = ?",
        [body.name.trim(), email, parseInt(id)],
      );
      const { rows: updated } = await db.execute(
        "SELECT * FROM family_members WHERE id = ?",
        [parseInt(id)],
      );
      return updated[0];
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error updating family member",
      });
      if (error.message?.includes("UNIQUE")) {
        return reply.code(409).send({ error: "Family member already exists" });
      }
      return reply.code(500).send({
        error: error.message || "Failed to update family member",
      });
    }
  });

  // Delete a family member
  fastify.delete("/family-members/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { rows } = await db.execute(
      "SELECT * FROM family_members WHERE id = ?",
      [parseInt(id)],
    );

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Family member not found" });
    }

    await db.execute("DELETE FROM food_ratings WHERE family_member_id = ?", [
      parseInt(id),
    ]);
    await db.execute("DELETE FROM family_members WHERE id = ?", [parseInt(id)]);

    return reply.code(204).send();
  });
}
