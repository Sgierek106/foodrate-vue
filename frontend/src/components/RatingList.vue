<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  getFoodRatings,
  getFamilyMembers,
  getPlaces,
  deleteFoodRating,
} from "@/api";
import type { FoodRating, FamilyMember, Place } from "@/types";
import { photoUrl } from "@/types";

const router = useRouter();

const ratings = ref<FoodRating[]>([]);
const members = ref<FamilyMember[]>([]);
const places = ref<Place[]>([]);
const selectedMember = ref<string>("");
const selectedPlace = ref<string>("");
const selectedRating = ref<string>("");
const searchQuery = ref("");
const isLoading = ref(false);
const lightboxPhoto = ref<string | null>(null);

function openLightbox(url: string) {
  lightboxPhoto.value = url;
}

async function loadRatings() {
  isLoading.value = true;
  try {
    const memberId = selectedMember.value
      ? parseInt(selectedMember.value)
      : undefined;
    const foodName = searchQuery.value || undefined;
    const placeId = selectedPlace.value
      ? parseInt(selectedPlace.value)
      : undefined;
    const rating = selectedRating.value
      ? parseInt(selectedRating.value)
      : undefined;
    ratings.value = await getFoodRatings(memberId, foodName, placeId, rating);
  } finally {
    isLoading.value = false;
  }
}

async function loadMembers() {
  members.value = await getFamilyMembers();
}

async function loadPlaces() {
  places.value = await getPlaces();
}

async function handleDelete(id: number) {
  if (!confirm("Delete this rating?")) return;
  await deleteFoodRating(id);
  await loadRatings();
}

function handleEdit(id: number) {
  router.push(`/edit-rating/${id}`);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

onMounted(() => {
  loadMembers();
  loadPlaces();
  loadRatings();
  window.addEventListener("rating-created", loadRatings);
  window.addEventListener("member-changed", loadMembers);
});
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold dark:text-white">Food Ratings</h2>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{{ ratings.length }} ratings</span
      >
    </div>

    <div class="flex gap-3 mb-6">
      <input
        v-model="searchQuery"
        @input="loadRatings"
        type="text"
        placeholder="Search by food..."
        class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />
      <select
        v-model="selectedMember"
        @change="loadRatings"
        class="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">All Members</option>
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.name }}
        </option>
      </select>
      <select
        v-model="selectedPlace"
        @change="loadRatings"
        class="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">All Places</option>
        <option v-for="place in places" :key="place.id" :value="place.id">
          {{ place.name }}
        </option>
      </select>
      <select
        v-model="selectedRating"
        @change="loadRatings"
        class="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">All Ratings</option>
        <option v-for="star in 5" :key="star" :value="star">
          {{ star }} ★
        </option>
      </select>
    </div>

    <div
      v-if="isLoading"
      class="text-center py-8 text-gray-400 dark:text-gray-500"
    >
      Loading...
    </div>

    <div
      v-else-if="ratings.length === 0"
      class="text-center py-8 text-gray-400 dark:text-gray-500"
    >
      No ratings yet. Add your first rating!
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="rating in ratings"
        :key="rating.id"
        class="border rounded-lg p-4 hover:shadow-sm transition-shadow dark:border-gray-700 dark:bg-gray-750"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 flex gap-3">
            <img
              v-if="photoUrl(rating.photo_path)"
              :src="photoUrl(rating.photo_path)!"
              :alt="rating.food_name"
              class="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-90 shrink-0"
              @click="openLightbox(photoUrl(rating.photo_path)!)"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium dark:text-white">
                  {{ rating.food_name }}
                </h3>
                <div class="flex text-yellow-400 text-sm">
                  <span v-for="star in 5" :key="star">
                    {{ star <= rating.rating ? "★" : "☆" }}
                  </span>
                </div>
              </div>
              <p
                v-if="rating.notes"
                class="text-sm text-gray-600 mb-2 dark:text-gray-400"
              >
                {{ rating.notes }}
              </p>
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <span class="font-medium text-blue-600 dark:text-blue-400">{{
                  rating.family_member_name
                }}</span>
                <span>•</span>
                <span>{{ formatDate(rating.created_at) }}</span>
                <span v-if="rating.place_name"
                  >• 📍 {{ rating.place_name }}</span
                >
              </div>
            </div>
          </div>
          <div class="flex gap-1.5 ml-2 shrink-0">
            <button
              @click="handleEdit(rating.id)"
              class="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 dark:active:bg-blue-900/50"
              title="Edit rating"
              aria-label="Edit rating"
            >
              ✎
            </button>
            <button
              @click="handleDelete(rating.id)"
              class="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 dark:active:bg-red-900/50"
              title="Delete rating"
              aria-label="Delete rating"
            >
              ✕
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Photo lightbox -->
    <div
      v-if="lightboxPhoto"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      @click="lightboxPhoto = null"
    >
      <img
        :src="lightboxPhoto"
        alt="Food photo"
        class="max-w-full max-h-full rounded-lg"
        @click.stop
      />
      <button
        class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
        @click="lightboxPhoto = null"
      >
        ✕
      </button>
    </div>
  </div>
</template>
