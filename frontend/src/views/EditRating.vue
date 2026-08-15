<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import RatingForm from "../components/RatingForm.vue";

const router = useRouter();
const route = useRoute();

const ratingId = parseInt(route.params.id as string);

const onRatingCreated = async () => {
  const event = new CustomEvent("rating-created");
  window.dispatchEvent(event);
  router.push("/");
};
</script>

<template>
  <main class="max-w-6xl mx-auto px-4 py-8">
    <div class="max-w-md mx-auto">
      <RatingForm :rating-id="ratingId" @rating-created="onRatingCreated" />
    </div>
  </main>
</template>
