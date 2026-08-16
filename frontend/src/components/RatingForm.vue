<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getFamilyMembers,
  createFoodRating,
  getPlaces,
  updateFoodRating,
  getFoodRating,
} from "@/api";
import type { FamilyMember, Place } from "@/types";
import { auth } from "@/auth";

const emit = defineEmits(["ratingCreated"]);
const props = defineProps<{
  ratingId?: number;
}>();

const members = ref<FamilyMember[]>([]);
const places = ref<Place[]>([]);

// Remember the last selected place so consecutive ratings for the same
// place don't require re-selecting it.
const lastPlaceId = parseInt(localStorage.getItem("lastPlaceId") || "0", 10);

const formData = ref({
  food_name: "",
  rating: 3,
  notes: "",
  family_member_id: 0,
  place_id: lastPlaceId,
});
const isSubmitting = ref(false);
const hoverRating = ref(0);

const isEditMode = !!props.ratingId;

function saveLastPlace() {
  if (formData.value.place_id) {
    localStorage.setItem("lastPlaceId", String(formData.value.place_id));
  }
}

async function loadMembers() {
  members.value = await getFamilyMembers();
  if (!isEditMode && members.value.length > 0) {
    // Default to the logged-in user if they're a family member,
    // otherwise fall back to the first member in the list.
    const userEmail = auth.user?.email?.toLowerCase();
    const currentMember = userEmail
      ? members.value.find((m) => m.email?.toLowerCase() === userEmail)
      : undefined;
    formData.value.family_member_id = (currentMember || members.value[0]).id;
  }
}

async function loadPlaces() {
  places.value = await getPlaces();
  // Restore the last place selection if it still exists
  if (
    !isEditMode &&
    lastPlaceId &&
    places.value.some((p) => p.id === lastPlaceId)
  ) {
    formData.value.place_id = lastPlaceId;
  }
}

async function loadRating() {
  if (!props.ratingId) return;
  const rating = await getFoodRating(props.ratingId);
  formData.value.food_name = rating.food_name;
  formData.value.rating = rating.rating;
  formData.value.notes = rating.notes || "";
  formData.value.family_member_id = rating.family_member_id;
  formData.value.place_id = rating.place_id || 0;
}

async function submitRating() {
  if (!formData.value.food_name.trim() || !formData.value.family_member_id)
    return;

  isSubmitting.value = true;
  try {
    const payload: any = {
      food_name: formData.value.food_name.trim(),
      rating: formData.value.rating,
      notes: formData.value.notes.trim() || undefined,
      family_member_id: formData.value.family_member_id,
    };
    if (formData.value.place_id) {
      payload.place_id = formData.value.place_id;
    }

    if (isEditMode && props.ratingId) {
      await updateFoodRating(props.ratingId, payload);
    } else {
      await createFoodRating(payload);
      // Remember the selected place for the next rating
      saveLastPlace();
      formData.value.food_name = "";
      formData.value.rating = 3;
      formData.value.notes = "";
      formData.value.place_id = 0;
    }

    emit("ratingCreated");
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  loadMembers();
  loadPlaces();
  if (isEditMode) {
    loadRating();
  }
  window.addEventListener("member-changed", loadMembers);
  window.addEventListener("place-changed", loadPlaces);
});
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
    <h2 class="text-lg font-semibold mb-4 dark:text-white">
      {{ isEditMode ? "Edit Rating" : "Add Rating" }}
    </h2>

    <form @submit.prevent="submitRating" class="space-y-4">
      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >Food</label
        >
        <input
          v-model="formData.food_name"
          type="text"
          placeholder="What did you eat?"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >Rating</label
        >
        <div class="flex gap-1">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            @click="formData.rating = star"
            @mouseenter="hoverRating = star"
            @mouseleave="hoverRating = 0"
            class="text-2xl transition-colors"
            :class="
              star <= (hoverRating || formData.rating)
                ? 'text-yellow-400'
                : 'text-gray-400 dark:text-gray-500'
            "
          >
            ★
          </button>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >Family Member</label
        >
        <select
          v-model="formData.family_member_id"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        >
          <option value="0" disabled>Select a member</option>
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.name }}
          </option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >Place (optional)</label
        >
        <select
          v-model="formData.place_id"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="0" disabled>No place selected</option>
          <option v-for="place in places" :key="place.id" :value="place.id">
            {{ place.name }}
          </option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >Notes (optional)</label
        >
        <textarea
          v-model="formData.notes"
          rows="2"
          placeholder="Any thoughts?"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <button
        type="submit"
        :disabled="
          !formData.food_name.trim() ||
          !formData.family_member_id ||
          isSubmitting
        "
        class="w-full px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50"
      >
        {{
          isSubmitting
            ? "Saving..."
            : isEditMode
              ? "Update Rating"
              : "Save Rating"
        }}
      </button>
    </form>
  </div>
</template>
