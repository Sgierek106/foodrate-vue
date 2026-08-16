import { FastifyInstance } from "fastify";
import { db } from "../database";

export default async function routes(fastify: FastifyInstance) {
  // Get all food ratings (optionally filtered by family member)
  fastify.get("/food-ratings", async (request) => {
    const { family_member_id, food_name, place_id, rating } = request.query as {
      family_member_id?: string;
      food_name?: string;
      place_id?: string;
      rating?: string;
    };

    let query = `
      SELECT fr.*, fm.name as family_member_name, p.name as place_name
      FROM food_ratings fr
      JOIN family_members fm ON fr.family_member_id = fm.id
      LEFT JOIN places p ON fr.place_id = p.id
    `;
    const params: (string | number)[] = [];

    if (family_member_id) {
      query += " WHERE fr.family_member_id = ?";
      params.push(parseInt(family_member_id));
    }

    if (food_name) {
      query += (params.length > 0 ? " AND" : " WHERE") + " fr.food_name LIKE ?";
      params.push(`%${food_name}%`);
    }

    if (place_id) {
      query += (params.length > 0 ? " AND" : " WHERE") + " fr.place_id = ?";
      params.push(parseInt(place_id));
    }

    if (rating) {
      query += (params.length > 0 ? " AND" : " WHERE") + " fr.rating = ?";
      params.push(parseInt(rating));
    }

    query += " ORDER BY fr.created_at DESC";

    const { rows } = await db.execute(query, params);
    return rows;
  });

  // Create a food rating
  fastify.post("/food-ratings", async (request, reply) => {
    const body = request.body as {
      food_name: string;
      rating: number;
      notes?: string;
      family_member_id: number;
      place_id?: number;
    };

    if (!body.food_name || typeof body.food_name !== "string") {
      return reply.code(400).send({ error: "Food name is required" });
    }

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return reply.code(400).send({ error: "Rating must be between 1 and 5" });
    }

    if (!body.family_member_id) {
      return reply.code(400).send({ error: "Family member ID is required" });
    }

    // Verify family member exists
    const memberCheck = await db.execute(
      "SELECT id FROM family_members WHERE id = ?",
      [body.family_member_id],
    );

    if (memberCheck.rows.length === 0) {
      return reply.code(404).send({ error: "Family member not found" });
    }

    // Verify place exists if provided
    if (body.place_id) {
      const placeCheck = await db.execute(
        "SELECT id FROM places WHERE id = ?",
        [body.place_id],
      );

      if (placeCheck.rows.length === 0) {
        return reply.code(404).send({ error: "Place not found" });
      }
    }

    try {
      const result = await db.execute(
        "INSERT INTO food_ratings (food_name, rating, notes, family_member_id, place_id) VALUES (?, ?, ?, ?, ?)",
        [
          body.food_name.trim(),
          body.rating,
          body.notes || null,
          body.family_member_id,
          body.place_id || null,
        ],
      );

      const { rows } = await db.execute(
        `
        SELECT fr.*, fm.name as family_member_name, p.name as place_name
        FROM food_ratings fr
        JOIN family_members fm ON fr.family_member_id = fm.id
        LEFT JOIN places p ON fr.place_id = p.id
        WHERE fr.id = ?
      `,
        [Number(result.lastInsertRowid)],
      );

      return reply.code(201).send(rows[0]);
    } catch (error: any) {
      throw error;
    }
  });

  // Get a single food rating by ID
  fastify.get("/food-ratings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { rows } = await db.execute(
      `
      SELECT fr.*, fm.name as family_member_name, p.name as place_name
      FROM food_ratings fr
      JOIN family_members fm ON fr.family_member_id = fm.id
      LEFT JOIN places p ON fr.place_id = p.id
      WHERE fr.id = ?
    `,
      [parseInt(id)],
    );

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Rating not found" });
    }

    return rows[0];
  });

  // Update a food rating
  fastify.put("/food-ratings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      food_name?: string;
      rating?: number;
      notes?: string;
      family_member_id?: number;
      place_id?: number;
    };

    const existing = await db.execute(
      "SELECT * FROM food_ratings WHERE id = ?",
      [parseInt(id)],
    );

    if (existing.rows.length === 0) {
      return reply.code(404).send({ error: "Rating not found" });
    }

    const current = existing.rows[0];
    const food_name = body.food_name?.trim() || current.food_name;
    const rating = body.rating ?? Number(current.rating);
    const notes = body.notes ?? current.notes;
    const family_member_id = body.family_member_id ?? current.family_member_id;
    const place_id = body.place_id ?? current.place_id;

    if (rating < 1 || rating > 5) {
      return reply.code(400).send({ error: "Rating must be between 1 and 5" });
    }

    // Verify family member exists if changed
    if (
      body.family_member_id &&
      body.family_member_id !== current.family_member_id
    ) {
      const memberCheck = await db.execute(
        "SELECT id FROM family_members WHERE id = ?",
        [body.family_member_id],
      );
      if (memberCheck.rows.length === 0) {
        return reply.code(404).send({ error: "Family member not found" });
      }
    }

    // Verify place exists if changed and provided
    if (body.place_id !== undefined && body.place_id !== current.place_id) {
      if (body.place_id) {
        const placeCheck = await db.execute(
          "SELECT id FROM places WHERE id = ?",
          [body.place_id],
        );
        if (placeCheck.rows.length === 0) {
          return reply.code(404).send({ error: "Place not found" });
        }
      }
    }

    await db.execute(
      "UPDATE food_ratings SET food_name = ?, rating = ?, notes = ?, family_member_id = ?, place_id = ? WHERE id = ?",
      [
        food_name,
        rating,
        notes,
        family_member_id,
        place_id || null,
        parseInt(id),
      ],
    );

    const { rows } = await db.execute(
      `
      SELECT fr.*, fm.name as family_member_name, p.name as place_name
      FROM food_ratings fr
      JOIN family_members fm ON fr.family_member_id = fm.id
      LEFT JOIN places p ON fr.place_id = p.id
      WHERE fr.id = ?
    `,
      [parseInt(id)],
    );

    return reply.code(200).send(rows[0]);
  });

  // Delete a food rating
  fastify.delete("/food-ratings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db.execute(
      "SELECT * FROM food_ratings WHERE id = ?",
      [parseInt(id)],
    );

    if (existing.rows.length === 0) {
      return reply.code(404).send({ error: "Rating not found" });
    }

    await db.execute("DELETE FROM food_ratings WHERE id = ?", [parseInt(id)]);

    return reply.code(204).send();
  });
}
