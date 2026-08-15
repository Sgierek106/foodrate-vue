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
    const body = request.body as { name: string };

    if (!body.name || typeof body.name !== "string") {
      return reply.code(400).send({ error: "Name is required" });
    }

    try {
      await db.execute("INSERT INTO family_members (name) VALUES (?)", [
        body.name.trim(),
      ]);
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
