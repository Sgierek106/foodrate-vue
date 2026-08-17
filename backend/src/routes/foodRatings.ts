import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FastifyInstance } from "fastify";
import { db } from "../database";
import { PHOTOS_DIR } from "../photos";

/**
 * Parse a rating request body. Handles both JSON and multipart/form-data
 * (the latter is used when a photo file is uploaded). Returns the form
 * fields plus the stored photo file name (or null if none was uploaded).
 */
async function parseRatingRequest(request: any): Promise<{
  fields: Record<string, string>;
  photo: string | null;
}> {
  if (!request.isMultipart()) {
    return {
      fields: (request.body || {}) as Record<string, string>,
      photo: null,
    };
  }

  const fields: Record<string, string> = {};
  let photo: string | null = null;
  const parts = await request.parts();
  for await (const part of parts) {
    if (part.type === "file") {
      if (part.fieldname === "photo" && !photo) {
        const ext = path.extname(part.filename || "").toLowerCase();
        const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
          ? ext
          : ".jpg";
        const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`;
        const buffer = await part.toBuffer();
        fs.writeFileSync(path.join(PHOTOS_DIR, name), buffer);
        photo = name;
      }
    } else if (part.type === "field") {
      fields[part.fieldname] = part.value;
    }
  }
  return { fields, photo };
}

function deletePhotoFile(photoPath: string | null | undefined) {
  if (!photoPath) return;
  const filePath = path.join(PHOTOS_DIR, path.basename(photoPath));
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Failed to delete photo file:", err);
    }
  });
}

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
    let parsed;
    try {
      parsed = await parseRatingRequest(request);
    } catch (error: any) {
      request.log.error(error, "Photo upload failed");
      return reply.code(400).send({ error: "Photo upload failed" });
    }
    const body = parsed.fields;
    const photoPath = parsed.photo;

    const food_name = body.food_name;
    const rating = Number(body.rating);
    const family_member_id = Number(body.family_member_id);
    const place_id = body.place_id ? Number(body.place_id) : null;

    if (!food_name || typeof food_name !== "string" || !food_name.trim()) {
      return reply.code(400).send({ error: "Food name is required" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return reply.code(400).send({ error: "Rating must be between 1 and 5" });
    }

    if (!family_member_id) {
      return reply.code(400).send({ error: "Family member ID is required" });
    }

    // Verify family member exists
    const memberCheck = await db.execute(
      "SELECT id FROM family_members WHERE id = ?",
      [family_member_id],
    );

    if (memberCheck.rows.length === 0) {
      return reply.code(404).send({ error: "Family member not found" });
    }

    // Verify place exists if provided
    if (place_id) {
      const placeCheck = await db.execute(
        "SELECT id FROM places WHERE id = ?",
        [place_id],
      );

      if (placeCheck.rows.length === 0) {
        return reply.code(404).send({ error: "Place not found" });
      }
    }

    try {
      const result = await db.execute(
        "INSERT INTO food_ratings (food_name, rating, notes, family_member_id, place_id, photo_path) VALUES (?, ?, ?, ?, ?, ?)",
        [
          food_name.trim(),
          rating,
          body.notes || null,
          family_member_id,
          place_id,
          photoPath,
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

    let parsed;
    try {
      parsed = await parseRatingRequest(request);
    } catch (error: any) {
      request.log.error(error, "Photo upload failed");
      return reply.code(400).send({ error: "Photo upload failed" });
    }
    const body = parsed.fields;
    const uploadedPhoto = parsed.photo;

    const existing = await db.execute(
      "SELECT * FROM food_ratings WHERE id = ?",
      [parseInt(id)],
    );

    if (existing.rows.length === 0) {
      return reply.code(404).send({ error: "Rating not found" });
    }

    const current = existing.rows[0];
    const food_name = body.food_name?.trim() || current.food_name;
    const rating =
      body.rating !== undefined ? Number(body.rating) : Number(current.rating);
    const notes = body.notes !== undefined ? body.notes : current.notes;
    const family_member_id =
      body.family_member_id !== undefined
        ? Number(body.family_member_id)
        : current.family_member_id;
    const place_id =
      body.place_id !== undefined
        ? body.place_id
          ? Number(body.place_id)
          : null
        : current.place_id;

    // Photo handling: a new upload replaces the current photo,
    // photo: null (JSON) removes it, otherwise keep the existing one.
    let photoPath: string | null =
      current.photo_path != null ? String(current.photo_path) : null;
    if (uploadedPhoto) {
      deletePhotoFile(photoPath);
      photoPath = uploadedPhoto;
    } else if (body.photo === null) {
      deletePhotoFile(photoPath);
      photoPath = null;
    }

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
      "UPDATE food_ratings SET food_name = ?, rating = ?, notes = ?, family_member_id = ?, place_id = ?, photo_path = ? WHERE id = ?",
      [
        food_name,
        rating,
        notes,
        family_member_id,
        place_id || null,
        photoPath,
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
    const deletedPhoto = existing.rows[0].photo_path;
    deletePhotoFile(deletedPhoto != null ? String(deletedPhoto) : null);

    return reply.code(204).send();
  });
}
