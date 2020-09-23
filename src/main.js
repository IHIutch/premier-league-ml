import Vue from "vue";
import App from "./App.vue";
import { BootstrapVue } from "bootstrap-vue";

import "@/assets/scss/main.scss";

Vue.config.productionTip = false;

Vue.use(BootstrapVue);

new Vue({
  render: h => h(App)
}).$mount("#app");
