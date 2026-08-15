import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import FamilyMembers from "./views/FamilyMembers.vue";
import AddRating from "./views/AddRating.vue";
import EditRating from "./views/EditRating.vue";
import Places from "./views/Places.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
    },
    {
      path: "/members",
      name: "Members",
      component: FamilyMembers,
    },
    {
      path: "/add-rating",
      name: "AddRating",
      component: AddRating,
    },
    {
      path: "/edit-rating/:id",
      name: "EditRating",
      component: EditRating,
    },
    {
      path: "/places",
      name: "Places",
      component: Places,
    },
  ],
});

export default router;
