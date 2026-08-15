import { FastifyInstance } from "fastify";
import { db } from "../database";

export default async function routes(fastify: FastifyInstance) {
  // Get all places
  fastify.get("/places", async () => {
    const { rows } = await db.execute("SELECT * FROM places ORDER BY name");
    return rows;
  });

  // Create a place
  fastify.post("/places", async (request, reply) => {
    const body = request.body as {
      name: string;
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    };

    if (!body.name || typeof body.name !== "string") {
      return reply.code(400).send({ error: "Place name is required" });
    }

    try {
      await db.execute(
        "INSERT INTO places (name, address, street, city, state, zip, country, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          body.name.trim(),
          body.address?.trim() || null,
          body.street?.trim() || null,
          body.city?.trim() || null,
          body.state?.trim() || null,
          body.zip?.trim() || null,
          body.country?.trim() || null,
          body.latitude || null,
          body.longitude || null,
        ],
      );

      const { rows } = await db.execute(
        "SELECT * FROM places WHERE rowid = last_insert_rowid()",
      );

      return reply.code(201).send(rows[0]);
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error creating place",
      });
      return reply.code(500).send({
        error: error.message || "Failed to create place",
      });
    }
  });

  // Update a place
  fastify.put("/places/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    };

    const { rows: existingRows } = await db.execute(
      "SELECT * FROM places WHERE id = ?",
      [parseInt(id)],
    );

    if (existingRows.length === 0) {
      return reply.code(404).send({ error: "Place not found" });
    }

    const current = existingRows[0];
    const name = body.name?.trim() || current.name;
    const address = body.address ?? current.address;
    const street = body.street ?? current.street;
    const city = body.city ?? current.city;
    const state = body.state ?? current.state;
    const zip = body.zip ?? current.zip;
    const country = body.country ?? current.country;
    const latitude = body.latitude ?? current.latitude;
    const longitude = body.longitude ?? current.longitude;

    await db.execute(
      "UPDATE places SET name = ?, address = ?, street = ?, city = ?, state = ?, zip = ?, country = ?, latitude = ?, longitude = ? WHERE id = ?",
      [
        name,
        address,
        street,
        city,
        state,
        zip,
        country,
        latitude,
        longitude,
        parseInt(id),
      ],
    );

    const { rows } = await db.execute("SELECT * FROM places WHERE id = ?", [
      parseInt(id),
    ]);

    return reply.code(200).send(rows[0]);
  });

  // Delete a place
  fastify.delete("/places/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { rows } = await db.execute("SELECT * FROM places WHERE id = ?", [
      parseInt(id),
    ]);

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Place not found" });
    }

    await db.execute("DELETE FROM places WHERE id = ?", [parseInt(id)]);

    return reply.code(204).send();
  });
}
