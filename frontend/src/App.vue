<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/AppHeader.vue";
import Login from "./views/Login.vue";
import { auth, loadAuth } from "./auth";

onMounted(() => {
  loadAuth();
});
</script>

<template>
  <div class="min-h-screen">
    <!-- Loading splash while we check the session -->
    <div
      v-if="auth.loading"
      class="min-h-screen flex items-center justify-center"
    >
      <div class="text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
    </div>

    <!-- Signed out -->
    <Login v-else-if="!auth.user" />

    <!-- Signed in -->
    <template v-else>
      <AppHeader />
      <router-view />
    </template>
  </div>
</template>
