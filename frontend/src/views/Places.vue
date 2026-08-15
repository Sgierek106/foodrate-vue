<script setup lang="ts">
import PlaceManager from "../components/PlaceManager.vue";

const onPlaceChanged = () => {
  const event = new CustomEvent("place-changed");
  window.dispatchEvent(event);
};
</script>

<template>
  <main class="max-w-6xl mx-auto px-4 py-8">
    <PlaceManager @place-changed="onPlaceChanged" />
  </main>
</template>
