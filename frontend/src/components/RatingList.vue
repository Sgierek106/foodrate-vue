<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getFoodRatings, getFamilyMembers, deleteFoodRating } from "@/api";
import type { FoodRating, FamilyMember } from "@/types";

const router = useRouter();

const ratings = ref<FoodRating[]>([]);
const members = ref<FamilyMember[]>([]);
const selectedMember = ref<string>("");
const searchQuery = ref("");
const isLoading = ref(false);

async function loadRatings() {
  isLoading.value = true;
  try {
    const memberId = selectedMember.value
      ? parseInt(selectedMember.value)
      : undefined;
    const foodName = searchQuery.value || undefined;
    ratings.value = await getFoodRatings(memberId, foodName);
  } finally {
    isLoading.value = false;
  }
}

async function loadMembers() {
  members.value = await getFamilyMembers();
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
          <div class="flex-1">
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
              <span v-if="rating.place_name">• 📍 {{ rating.place_name }}</span>
            </div>
          </div>
          <div class="flex gap-1 ml-2">
            <button
              @click="handleEdit(rating.id)"
              class="text-gray-300 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
              title="Edit rating"
            >
              ✎
            </button>
            <button
              @click="handleDelete(rating.id)"
              class="text-gray-300 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              title="Delete rating"
            >
              ✕
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
