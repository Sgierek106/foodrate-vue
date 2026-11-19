import { FastifyInstance } from "fastify";

const PLACES_BASE = "https://places.googleapis.com/v1";

// Field mask for Place Details (New) — everything the frontend consumes.
const DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,addressComponents,location";

// Field mask for Autocomplete (New).
const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";

// The New Places API uses camelCase component types (streetNumber, city,
// administrativeArea1...). The frontend was written against the legacy
// snake_case types (street_number, locality, administrative_area_level_1...),
// so translate each address component back to the legacy shape.
const TYPE_MAP: Record<string, string> = {
  streetNumber: "street_number",
  route: "route",
  city: "locality",
  town: "locality",
  village: "locality",
  administrativeArea1: "administrative_area_level_1",
  administrativeArea2: "administrative_area_level_2",
  postalCode: "postal_code",
  country: "country",
  subpremise: "subpremise",
  premise: "premise",
  neighborhood: "neighborhood",
  sublocality: "sublocality",
};

function toLegacyAddressComponent(c: any) {
  return {
    long_name: c.longText ?? "",
    short_name: c.shortText ?? "",
    types: (c.types || []).map((t: string) => TYPE_MAP[t] ?? t),
  };
}

export default async function routes(fastify: FastifyInstance) {
  // Accept either name: GOOGLE_MAPS_API_KEY (documented) or
  // GOOGLE_PLACES_API_KEY (what some deployments use).
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    fastify.log.warn(
      "GOOGLE_MAPS_API_KEY not set - Google Maps features will not work",
    );
  }

  // Autocomplete endpoint (Places API New)
  fastify.get("/google-maps/autocomplete", async (request, reply) => {
    if (!apiKey) {
      return reply
        .code(503)
        .send({ error: "Google Maps API key not configured" });
    }

    const { input, sessiontoken, location, radius } = request.query as {
      input: string;
      sessiontoken?: string;
      location?: string;
      radius?: number;
    };

    if (!input || typeof input !== "string") {
      return reply.code(400).send({ error: "Input parameter is required" });
    }

    const body: any = { input };
    if (sessiontoken) body.sessionToken = sessiontoken;

    // Bias results toward the user's location when the browser provided one.
    if (location) {
      const [lat, lng] = location.split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        body.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius && Number.isFinite(Number(radius))
              ? Number(radius)
              : 5000,
          },
        };
      }
    }

    try {
      const response = await fetch(`${PLACES_BASE}/places:autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK,
        },
        body: JSON.stringify(body),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        fastify.log.error({
          status: response.status,
          err: data?.error,
          message: "Google Maps autocomplete API error",
        });
        return reply
          .code(502)
          .send({ error: data?.error?.message || "Google Maps API error" });
      }

      // Map New predictions onto the legacy prediction shape the frontend expects.
      const predictions = (data.suggestions || [])
        .map((s: any) => s.placePrediction)
        .filter(Boolean)
        .map((p: any) => ({
          place_id: p.placeId,
          description: p.text?.text ?? "",
          structured_formatting: {
            main_text: p.structuredFormat?.mainText?.text ?? "",
            secondary_text: p.structuredFormat?.secondaryText?.text ?? "",
          },
        }));

      return predictions;
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

  // Place details endpoint (Places API New)
  fastify.get("/google-maps/place-details", async (request, reply) => {
    if (!apiKey) {
      return reply
        .code(503)
        .send({ error: "Google Maps API key not configured" });
    }

    const { placeId, sessiontoken } = request.query as {
      placeId: string;
      sessiontoken?: string;
    };

    if (!placeId || typeof placeId !== "string") {
      return reply.code(400).send({ error: "placeId parameter is required" });
    }

    const url = new URL(
      `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
    );
    if (sessiontoken) url.searchParams.set("sessionToken", sessiontoken);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        fastify.log.error({
          status: response.status,
          err: data?.error,
          message: "Google Maps place details API error",
        });
        return reply
          .code(502)
          .send({ error: data?.error?.message || "Google Maps API error" });
      }

      // Map the New Place resource onto the legacy details shape the
      // frontend expects (name, formatted_address, address_components,
      // geometry.location.lat/lng).
      return {
        place_id: data.id,
        name: data.displayName?.text ?? "",
        formatted_address: data.formattedAddress ?? "",
        address_components: (data.addressComponents || []).map(
          toLegacyAddressComponent,
        ),
        geometry: data.location
          ? {
              location: {
                lat: data.location.latitude,
                lng: data.location.longitude,
              },
            }
          : undefined,
      };
    } catch (error: any) {
      fastify.log.error({
        err: error,
        message: "Error calling Google Maps place details",
      });
      return reply.code(500).send({ error: "Failed to fetch place details" });
    }
  });
}
