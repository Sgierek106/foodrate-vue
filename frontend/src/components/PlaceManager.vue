<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  searchGoogleMapsAutocomplete,
  getGoogleMapsPlaceDetails,
} from "@/api";
import type { Place } from "@/types";

const emit = defineEmits(["placeChanged"]);

const places = ref<Place[]>([]);
const newName = ref("");
const newStreet = ref("");
const newCity = ref("");
const newState = ref("");
const newZip = ref("");
const newCountry = ref("");
const newLatitude = ref<number | null>(null);
const newLongitude = ref<number | null>(null);
const isLoading = ref(false);
const error = ref("");

// Google Maps search state
const searchQuery = ref("");
const searchResults = ref<
  {
    place_id: string;
    description: string;
    main_text: string;
    secondary_text: string;
  }[]
>([]);
const isSearching = ref(false);
const showSearchDropdown = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Geolocation state
const userLatitude = ref<number | null>(null);
const userLongitude = ref<number | null>(null);
const locationReady = ref(false);

// Session token for Google Maps billing
const sessionToken = ref(crypto.randomUUID());

// Edit state
const editingId = ref<number | null>(null);
const editName = ref("");
const editStreet = ref("");
const editCity = ref("");
const editState = ref("");
const editZip = ref("");
const editCountry = ref("");

async function loadPlaces() {
  isLoading.value = true;
  try {
    places.value = await getPlaces();
  } catch (e: any) {
    error.value = e.response?.data?.error || "Failed to load places";
  } finally {
    isLoading.value = false;
  }
}

async function addPlace() {
  if (!newName.value.trim()) return;
  error.value = "";
  try {
    await createPlace({
      name: newName.value.trim(),
      street: newStreet.value.trim() || undefined,
      city: newCity.value.trim() || undefined,
      state: newState.value.trim() || undefined,
      zip: newZip.value.trim() || undefined,
      country: newCountry.value.trim() || undefined,
      latitude: newLatitude.value ?? undefined,
      longitude: newLongitude.value ?? undefined,
    });
    resetForm();
    await loadPlaces();
    emit("placeChanged");
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to add place";
    error.value = message;
    alert(message);
  }
}

function resetForm() {
  newName.value = "";
  newStreet.value = "";
  newCity.value = "";
  newState.value = "";
  newZip.value = "";
  newCountry.value = "";
  newLatitude.value = null;
  newLongitude.value = null;
  searchQuery.value = "";
  searchResults.value = [];
  showSearchDropdown.value = false;
}

function hideSearchDropdown() {
  setTimeout(() => (showSearchDropdown.value = false), 200);
}

async function searchLocation() {
  if (!searchQuery.value.trim() || searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    showSearchDropdown.value = false;
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    return;
  }

  // Debounce: wait 300ms after the user stops typing before searching
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    performSearch();
  }, 300);
}

async function performSearch() {
  isSearching.value = true;
  error.value = "";
  try {
    const options: {
      sessiontoken?: string;
      location?: string;
    } = {
      sessiontoken: sessionToken.value,
    };

    if (userLatitude.value !== null && userLongitude.value !== null) {
      options.location = `${userLatitude.value},${userLongitude.value}`;
    }

    const results = await searchGoogleMapsAutocomplete(
      searchQuery.value.trim(),
      options,
    );

    searchResults.value = results.map((r: any) => ({
      place_id: r.place_id,
      description: r.description,
      main_text: r.structured_formatting?.main_text || "",
      secondary_text: r.structured_formatting?.secondary_text || "",
    }));

    showSearchDropdown.value = searchResults.value.length > 0;
  } catch (e: any) {
    error.value = "Location search failed. Please enter the address manually.";
    searchResults.value = [];
    showSearchDropdown.value = false;
  } finally {
    isSearching.value = false;
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    error.value = "Geolocation is not supported by your browser.";
    return;
  }
  locationReady.value = false;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLatitude.value = position.coords.latitude;
      userLongitude.value = position.coords.longitude;
      locationReady.value = true;
      error.value = "";
    },
    (err) => {
      locationReady.value = false;
      error.value = `Location access denied: ${err.message}`;
    },
    { enableHighAccuracy: false, timeout: 10000 },
  );
}

async function selectSearchResult(result: {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}) {
  isSearching.value = true;
  error.value = "";
  try {
    const details = await getGoogleMapsPlaceDetails(
      result.place_id,
      sessionToken.value,
    );

    // Extract address components
    const components = details.address_components || [];

    const streetNumber =
      components.find((c) => c.types.includes("street_number"))?.long_name ||
      "";
    const route =
      components.find((c) => c.types.includes("route"))?.long_name || "";
    const city =
      components.find((c) => c.types.includes("locality"))?.long_name || "";
    const state =
      components.find((c) => c.types.includes("administrative_area_level_1"))
        ?.short_name || "";
    const zip =
      components.find((c) => c.types.includes("postal_code"))?.long_name || "";
    const country =
      components.find((c) => c.types.includes("country"))?.long_name || "";

    newName.value = details.name || result.main_text;
    newStreet.value = `${streetNumber} ${route}`.trim();
    newCity.value = city;
    newState.value = state;
    newZip.value = zip;
    newCountry.value = country;
    newLatitude.value = details.geometry?.location?.lat || null;
    newLongitude.value = details.geometry?.location?.lng || null;

    // Reset session token for next search (Google Maps billing requirement)
    sessionToken.value = crypto.randomUUID();
  } catch (e: any) {
    error.value =
      "Failed to fetch location details. Please enter the address manually.";
  } finally {
    isSearching.value = false;
    searchResults.value = [];
    showSearchDropdown.value = false;
    searchQuery.value = "";
  }
}

function startEdit(place: Place) {
  editingId.value = place.id;
  editName.value = place.name;
  editStreet.value = place.street || "";
  editCity.value = place.city || "";
  editState.value = place.state || "";
  editZip.value = place.zip || "";
  editCountry.value = place.country || "";
}

async function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return;
  error.value = "";
  try {
    await updatePlace(editingId.value, {
      name: editName.value.trim(),
      street: editStreet.value.trim() || "",
      city: editCity.value.trim() || "",
      state: editState.value.trim() || "",
      zip: editZip.value.trim() || "",
      country: editCountry.value.trim() || "",
    });
    editingId.value = null;
    editName.value = "";
    editStreet.value = "";
    editCity.value = "";
    editState.value = "";
    editZip.value = "";
    editCountry.value = "";
    await loadPlaces();
    emit("placeChanged");
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to update place";
    error.value = message;
    alert(message);
  }
}

async function removePlace(id: number) {
  if (
    !confirm(
      "Delete this place? Ratings associated with it will have the place cleared.",
    )
  )
    return;
  error.value = "";
  try {
    await deletePlace(id);
    await loadPlaces();
    emit("placeChanged");
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to remove place";
    error.value = message;
    alert(message);
  }
}

function formatAddress(place: Place): string {
  const parts = [place.street, place.city, place.state, place.zip].filter(
    Boolean,
  );
  return parts.join(", ") || place.address || "";
}

onMounted(() => {
  loadPlaces();
  getCurrentLocation();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
    <h2 class="text-lg font-semibold mb-4 dark:text-white">Manage Places</h2>

    <!-- Add New Place Form -->
    <form @submit.prevent="addPlace" class="space-y-3 mb-6">
      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
        >
          Search Location (Google Maps)
        </label>
        <div class="relative">
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              @input="searchLocation"
              @focus="showSearchDropdown = searchResults.length > 0"
              @blur.self="hideSearchDropdown"
              type="text"
              placeholder="Start typing to search locations..."
              class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              @click="getCurrentLocation"
              :disabled="!locationReady"
              class="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
              :title="
                locationReady ? 'Search near my location' : 'Get my location'
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          <!-- Search Results Dropdown -->
          <div
            v-if="showSearchDropdown && searchResults.length > 0"
            class="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-700 dark:border-gray-600"
          >
            <button
              v-for="result in searchResults"
              :key="result.place_id"
              type="button"
              @click="selectSearchResult(result)"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 border-b last:border-b-0 dark:border-gray-600"
            >
              <div class="font-medium">
                {{ result.main_text }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ result.secondary_text }}
              </div>
            </button>
          </div>

          <!-- Loading indicator -->
          <div v-if="isSearching" class="absolute right-10 top-2">
            <svg
              class="h-4 w-4 animate-spin text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <!-- Location ready indicator -->
          <div
            v-if="locationReady"
            class="absolute right-16 top-2 text-xs text-green-600 dark:text-green-400 pointer-events-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
        >
          Place Name *
        </label>
        <input
          v-model="newName"
          type="text"
          placeholder="e.g. Joe's Pizza"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
        >
          Street Address
        </label>
        <input
          v-model="newStreet"
          type="text"
          placeholder="123 Main St"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            City
          </label>
          <input
            v-model="newCity"
            type="text"
            placeholder="New York"
            class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            State / Province
          </label>
          <input
            v-model="newState"
            type="text"
            placeholder="NY"
            class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            ZIP / Postal Code
          </label>
          <input
            v-model="newZip"
            type="text"
            placeholder="10001"
            class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            Country
          </label>
          <input
            v-model="newCountry"
            type="text"
            placeholder="United States"
            class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <button
        type="submit"
        :disabled="!newName.trim() || isLoading"
        class="w-full px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
      >
        Add Place
      </button>
    </form>

    <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

    <!-- Places List -->
    <ul class="space-y-2">
      <li
        v-for="place in places"
        :key="place.id"
        class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md dark:bg-gray-700"
      >
        <div class="flex-1 min-w-0">
          <template v-if="editingId === place.id">
            <div class="space-y-2">
              <input
                v-model="editName"
                type="text"
                class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                placeholder="Place Name"
              />
              <input
                v-model="editStreet"
                type="text"
                class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                placeholder="Street"
              />
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="editCity"
                  type="text"
                  class="px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="City"
                />
                <input
                  v-model="editState"
                  type="text"
                  class="px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="State"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="editZip"
                  type="text"
                  class="px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="ZIP"
                />
                <input
                  v-model="editCountry"
                  type="text"
                  class="px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="Country"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveEdit"
                  class="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  @click="editingId = null"
                  class="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 dark:bg-gray-500 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="text-sm font-medium dark:text-gray-200">
              {{ place.name }}
            </div>
            <div
              v-if="place.street || place.city"
              class="text-xs text-gray-500 dark:text-gray-400 truncate"
            >
              {{ formatAddress(place) }}
            </div>
          </template>
        </div>
        <div v-if="editingId !== place.id" class="flex gap-1 ml-2">
          <button
            @click="startEdit(place)"
            class="text-blue-400 hover:text-blue-600 text-xs dark:hover:text-blue-300"
          >
            Edit
          </button>
          <button
            @click="removePlace(place.id)"
            class="text-red-400 hover:text-red-600 text-xs dark:hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </li>
      <li
        v-if="places.length === 0"
        class="text-sm text-gray-400 text-center py-4 dark:text-gray-500"
      >
        No places yet. Search for a location or add one manually.
      </li>
    </ul>
  </div>
</template>
