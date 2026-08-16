import { FastifyInstance } from "fastify";

export default async function routes(fastify: FastifyInstance) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    fastify.log.warn(
      "GOOGLE_MAPS_API_KEY not set - Google Maps features will not work",
    );
  }

  // Autocomplete endpoint
  fastify.get("/google-maps/autocomplete", async (request, reply) => {
    if (!apiKey) {
      return reply
        .code(503)
        .send({ error: "Google Maps API key not configured" });
    }

    const { input, sessiontoken, location, radius, offset } = request.query as {
      input: string;
      sessiontoken?: string;
      location?: string;
      radius?: number;
      offset?: number;
    };

    if (!input || typeof input !== "string") {
      return reply.code(400).send({ error: "Input parameter is required" });
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&types=establishment|geocode`;

      if (sessiontoken)
        url += `&sessiontoken=${encodeURIComponent(sessiontoken)}`;
      if (location) url += `&location=${encodeURIComponent(location)}`;
      if (radius) url += `&radius=${radius}`;
      if (offset !== undefined) url += `&offset=${offset}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        fastify.log.error({
          err: errorData,
          message: "Google Maps autocomplete API error",
        });
        return reply.code(502).send({ error: "Google Maps API error" });
      }

      const data: any = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        return data.predictions || [];
      }

      fastify.log.error({
        status: data.status,
        message: "Google Maps autocomplete error",
      });
      return reply
        .code(502)
        .send({ error: `Google Maps API error: ${data.status}` });
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error calling Google Maps autocomplete",
      });
      return reply
        .code(500)
        .send({ error: "Failed to fetch autocomplete suggestions" });
    }
  });

  // Place details endpoint
  fastify.get("/google-maps/place-details", async (request, reply) => {
    if (!apiKey) {
      return reply
        .code(503)
        .send({ error: "Google Maps API key not configured" });
    }

    const { placeId, sessiontoken, fields } = request.query as {
      placeId: string;
      sessiontoken?: string;
      fields?: string;
    };

    if (!placeId || typeof placeId !== "string") {
      return reply.code(400).send({ error: "placeId parameter is required" });
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;

      if (sessiontoken)
        url += `&sessiontoken=${encodeURIComponent(sessiontoken)}`;
      if (fields) url += `&fields=${encodeURIComponent(fields)}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        fastify.log.error({
          err: errorData,
          message: "Google Maps place details API error",
        });
        return reply.code(502).send({ error: "Google Maps API error" });
      }

      const data: any = await response.json();

      if (data.status === "OK") {
        return data.result;
      }

      fastify.log.error({
        status: data.status,
        message: "Google Maps place details error",
      });
      return reply
        .code(502)
        .send({ error: `Google Maps API error: ${data.status}` });
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error calling Google Maps place details",
      });
      return reply.code(500).send({ error: "Failed to fetch place details" });
    }
  });
}
