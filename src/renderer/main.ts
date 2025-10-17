import { createApp } from 'vue'

import App from '@/renderer/App.vue'
import router from '@/renderer/router'
import vuetify from '@/renderer/plugins/vuetify'
import pinia from '@/renderer/plugins/pinia'

// Add API key defined in contextBridge to window object type
declare global {
  interface Window {
    mainApi?: any
  }
}

const app = createApp(App)

app.use(vuetify).use(router).use(pinia)

app.mount('#app')
