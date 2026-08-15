<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
} from "@/api";
import type { FamilyMember } from "@/types";

const members = ref<FamilyMember[]>([]);
const newName = ref("");
const isLoading = ref(false);
const error = ref("");

async function loadMembers() {
  isLoading.value = true;
  try {
    members.value = await getFamilyMembers();
  } catch (e: any) {
    error.value = e.response?.data?.error || "Failed to load family members";
  } finally {
    isLoading.value = false;
  }
}

async function addMember() {
  if (!newName.value.trim()) return;
  error.value = "";
  try {
    await createFamilyMember(newName.value.trim());
    newName.value = "";
    await loadMembers();
    const event = new CustomEvent("member-changed");
    window.dispatchEvent(event);
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to add family member";
    error.value = message;
    alert(message);
  }
}

async function removeMember(id: number) {
  if (!confirm("Delete this family member and all their ratings?")) return;
  error.value = "";
  try {
    await deleteFamilyMember(id);
    await loadMembers();
    const event = new CustomEvent("member-changed");
    window.dispatchEvent(event);
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to remove family member";
    error.value = message;
    alert(message);
  }
}

onMounted(loadMembers);
</script>

<template>
  <main class="max-w-6xl mx-auto px-4 py-8">
    <div class="max-w-xl">
      <div class="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
        <form @submit.prevent="addMember" class="flex gap-2 mb-4">
          <input
            v-model="newName"
            type="text"
            placeholder="Add family member..."
            class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            type="submit"
            :disabled="!newName.trim() || isLoading"
            class="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

        <ul class="space-y-2">
          <li
            v-for="member in members"
            :key="member.id"
            class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md dark:bg-gray-700"
          >
            <span class="text-sm dark:text-gray-200">{{ member.name }}</span>
            <button
              @click="removeMember(member.id)"
              class="text-red-400 hover:text-red-600 text-xs dark:hover:text-red-300"
            >
              Remove
            </button>
          </li>
          <li
            v-if="members.length === 0"
            class="text-sm text-gray-400 text-center py-4 dark:text-gray-500"
          >
            No family members yet
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
