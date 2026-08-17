import axios from "axios";
import type {
  FamilyMember,
  FoodRating,
  Place,
  GoogleMapsAutocompletePrediction,
  GoogleMapsPlaceDetails,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
});

// If the session expires mid-use, send the browser to Google sign-in
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || "";
    if (status === 401 && !url.includes("/auth/")) {
      window.location.href = "/api/auth/login";
    }
    return Promise.reject(error);
  },
);

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export function loginWithGoogle() {
  // Tell the backend where to return after the Google sign-in completes.
  // In dev the SPA runs on :5173 while the backend (and the OAuth callback)
  // live on :3000, so we pass the SPA origin explicitly.
  const next = encodeURIComponent(window.location.origin + "/");
  window.location.href = `/api/auth/login?next=${next}`;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function getFamilyMembers() {
  const { data } = await api.get<FamilyMember[]>("/family-members");
  return data;
}

export async function createFamilyMember(name: string, email: string) {
  const { data } = await api.post<FamilyMember>("/family-members", {
    name,
    email,
  });
  return data;
}

export async function updateFamilyMember(
  id: number,
  name: string,
  email: string,
) {
  const { data } = await api.put<FamilyMember>(`/family-members/${id}`, {
    name,
    email,
  });
  return data;
}

export async function deleteFamilyMember(id: number) {
  await api.delete(`/family-members/${id}`);
}

export async function getPlaces() {
  const { data } = await api.get<Place[]>("/places");
  return data;
}

export async function createPlace(place: {
  name: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}) {
  const { data } = await api.post<Place>("/places", place);
  return data;
}

export async function updatePlace(
  id: number,
  updates: {
    name?: string;
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  const { data } = await api.put<Place>(`/places/${id}`, updates);
  return data;
}

export async function deletePlace(id: number) {
  await api.delete(`/places/${id}`);
}

export async function getFoodRatings(
  familyMemberId?: number,
  foodName?: string,
  placeId?: number,
  rating?: number,
) {
  const params: Record<string, string> = {};
  if (familyMemberId) params.family_member_id = String(familyMemberId);
  if (foodName) params.food_name = foodName;
  if (placeId) params.place_id = String(placeId);
  if (rating) params.rating = String(rating);
  const { data } = await api.get<FoodRating[]>("/food-ratings", { params });
  return data;
}

export async function createFoodRating(
  rating: {
    food_name: string;
    rating: number;
    notes?: string;
    family_member_id: number;
    place_id?: number;
  },
  photo?: File | null,
) {
  let payload: any = rating;
  if (photo) {
    const formData = new FormData();
    formData.append("photo", photo);
    for (const [key, value] of Object.entries(rating)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }
    payload = formData;
  }
  const { data } = await api.post<FoodRating>("/food-ratings", payload);
  return data;
}

export async function getFoodRating(id: number) {
  const { data } = await api.get<FoodRating>(`/food-ratings/${id}`);
  return data;
}

export async function updateFoodRating(
  id: number,
  updates: {
    food_name?: string;
    rating?: number;
    notes?: string;
    family_member_id?: number;
    place_id?: number;
    /** null removes the existing photo */
    photo?: null;
  },
  photo?: File | null,
) {
  if (photo) {
    const formData = new FormData();
    formData.append("photo", photo);
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }
    const { data } = await api.put<FoodRating>(`/food-ratings/${id}`, formData);
    return data;
  }
  const { data } = await api.put<FoodRating>(`/food-ratings/${id}`, updates);
  return data;
}

export async function deleteFoodRating(id: number) {
  await api.delete(`/food-ratings/${id}`);
}

export async function searchGoogleMapsAutocomplete(
  input: string,
  options?: {
    sessiontoken?: string;
    location?: string; // "lat,lng" format
    radius?: number;
  },
) {
  const params: Record<string, string | number> = { input };
  if (options?.sessiontoken) params.sessiontoken = options.sessiontoken;
  if (options?.location) params.location = options.location;
  if (options?.radius) params.radius = options.radius;
  const { data } = await api.get<GoogleMapsAutocompletePrediction[]>(
    "/google-maps/autocomplete",
    { params },
  );
  return data;
}

export async function getGoogleMapsPlaceDetails(
  placeId: string,
  sessiontoken?: string,
) {
  const params: Record<string, string> = { placeId };
  if (sessiontoken) params.sessiontoken = sessiontoken;
  const fields = "name,formatted_address,address_components,geometry";
  params.fields = fields;
  const { data } = await api.get<GoogleMapsPlaceDetails>(
    "/google-maps/place-details",
    { params },
  );
  return data;
}
