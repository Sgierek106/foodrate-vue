<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { auth, logout } from "@/auth";

const router = useRouter();
const route = useRoute();

const isDark = ref(false);
const showUserMenu = ref(false);

const signOut = async () => {
  showUserMenu.value = false;
  await logout();
};

onMounted(() => {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  isDark.value = saved ? saved === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", isDark.value);

  // Follow OS theme changes when the user hasn't made an explicit choice
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        isDark.value = e.matches;
        document.documentElement.classList.toggle("dark", isDark.value);
      }
    });
});

const toggleDark = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle("dark", isDark.value);
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
};

// Pages that are sub-pages (show back button instead of full nav)
const isSubPage = route.path !== "/";
</script>

<template>
  <header
    class="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Back button on sub-pages -->
        <button
          v-if="isSubPage"
          @click="router.push('/')"
          class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back
        </button>
        <div @click="router.push('/')" class="cursor-pointer">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            🍽️ FoodRate
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Family Food Rating Tracker
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Add Rating Button -->
        <button
          @click="router.push('/add-rating')"
          class="px-3 py-2 rounded-lg text-sm bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 inline mr-1 -ml-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Rating
        </button>

        <!-- Members Link -->
        <button
          @click="router.push('/members')"
          class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 inline mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Members
        </button>

        <!-- Places Link -->
        <button
          @click="router.push('/places')"
          class="px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 inline mr-1"
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
          Places
        </button>

        <!-- Signed-in user -->
        <div class="relative">
          <button
            @click="showUserMenu = !showUserMenu"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="auth.user?.email"
          >
            <img
              v-if="auth.user?.picture"
              :src="auth.user.picture"
              :alt="auth.user.name"
              class="h-7 w-7 rounded-full"
            />
            <span
              v-else
              class="h-7 w-7 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center"
            >
              {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
            </span>
            <span
              class="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 max-w-[10rem] truncate"
            >
              {{ auth.user?.name }}
            </span>
          </button>
          <div
            v-if="showUserMenu"
            class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10"
          >
            <div
              class="px-4 py-2 border-b border-gray-100 dark:border-gray-700"
            >
              <p
                class="text-sm font-medium text-gray-900 dark:text-white truncate"
              >
                {{ auth.user?.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ auth.user?.email }}
              </p>
            </div>
            <button
              @click="signOut"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <!-- Dark Mode Toggle -->
        <button
          @click="toggleDark"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          :class="isDark ? 'text-yellow-400' : 'text-gray-500'"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg
            v-if="isDark"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
