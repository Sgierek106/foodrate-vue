<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "@/api";
import type { FamilyMember } from "@/types";

const members = ref<FamilyMember[]>([]);
const newName = ref("");
const newEmail = ref("");
const editingId = ref<number | null>(null);
const editName = ref("");
const editEmail = ref("");
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
  if (!newName.value.trim() || !newEmail.value.trim()) return;
  error.value = "";
  try {
    await createFamilyMember(newName.value.trim(), newEmail.value.trim());
    newName.value = "";
    newEmail.value = "";
    await loadMembers();
    const event = new CustomEvent("member-changed");
    window.dispatchEvent(event);
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to add family member";
    error.value = message;
    alert(message);
  }
}

function startEdit(member: FamilyMember) {
  editingId.value = member.id;
  editName.value = member.name;
  editEmail.value = member.email || "";
}

function cancelEdit() {
  editingId.value = null;
  editName.value = "";
  editEmail.value = "";
}

async function saveEdit() {
  if (editingId.value === null) return;
  if (!editName.value.trim() || !editEmail.value.trim()) return;
  error.value = "";
  try {
    await updateFamilyMember(
      editingId.value,
      editName.value.trim(),
      editEmail.value.trim(),
    );
    cancelEdit();
    await loadMembers();
    const event = new CustomEvent("member-changed");
    window.dispatchEvent(event);
  } catch (e: any) {
    const message = e.response?.data?.error || "Failed to update family member";
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
        <form @submit.prevent="addMember" class="flex flex-col gap-2 mb-4">
          <div class="flex gap-2">
            <input
              v-model="newName"
              type="text"
              placeholder="Name"
              class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <input
              v-model="newEmail"
              type="email"
              placeholder="Email"
              class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            type="submit"
            :disabled="!newName.trim() || !newEmail.trim() || isLoading"
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
            <template v-if="editingId === member.id">
              <div class="flex flex-1 gap-2 pr-2">
                <input
                  v-model="editName"
                  type="text"
                  placeholder="Name"
                  class="flex-1 px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input
                  v-model="editEmail"
                  type="email"
                  placeholder="Email"
                  class="flex-1 px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveEdit"
                  :disabled="!editName.trim() || !editEmail.trim() || isLoading"
                  class="text-green-500 hover:text-green-600 text-xs disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="text-gray-400 hover:text-gray-600 text-xs dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </template>
            <template v-else>
              <span class="text-sm dark:text-gray-200">
                {{ member.name }}
                <span
                  v-if="member.email"
                  class="text-gray-400 dark:text-gray-400"
                  >({{ member.email }})</span
                >
              </span>
              <div class="flex gap-2">
                <button
                  @click="startEdit(member)"
                  class="text-blue-400 hover:text-blue-600 text-xs dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  @click="removeMember(member.id)"
                  class="text-red-400 hover:text-red-600 text-xs dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </template>
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
