import { createApp } from "vue";
import "element-plus/dist/index.css";
import "./style.css";
import ElementPlus from "element-plus";
import App from "./App.vue";

const app = createApp(App);
app.use(ElementPlus);
app.mount("#app");
