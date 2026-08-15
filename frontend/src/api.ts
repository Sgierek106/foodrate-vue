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

export async function getFamilyMembers() {
  const { data } = await api.get<FamilyMember[]>("/family-members");
  return data;
}

export async function createFamilyMember(name: string) {
  const { data } = await api.post<FamilyMember>("/family-members", { name });
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
) {
  const params: Record<string, string> = {};
  if (familyMemberId) params.family_member_id = String(familyMemberId);
  if (foodName) params.food_name = foodName;
  const { data } = await api.get<FoodRating[]>("/food-ratings", { params });
  return data;
}

export async function createFoodRating(rating: {
  food_name: string;
  rating: number;
  notes?: string;
  family_member_id: number;
  place_id?: number;
}) {
  const { data } = await api.post<FoodRating>("/food-ratings", rating);
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
  },
) {
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
