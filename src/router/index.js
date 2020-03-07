import Vue from "vue";
import VueRouter from "vue-router";
import Home from "../views/Home.vue";

Vue.use(VueRouter);

const router = new VueRouter({
  mode: "hash",
  base: process.env.BASE_URL,
  router: [
    {
      path: "/",
      name: "Home",
      component: Home
    }
  ]
});

export default router;
