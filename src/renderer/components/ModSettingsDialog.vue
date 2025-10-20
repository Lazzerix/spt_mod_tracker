<script setup lang="ts">
import { computed } from 'vue'
import { sendNotification } from '@/renderer/utils'
import { useMainStore } from '@/renderer/store/main'

const store = useMainStore()
const dialog = defineModel<boolean>('dialog')

const automaticTrackingEnable = computed({
  get() {
    return store.automaticTrackingEnable
  },
  set(state) {
    store.setAutomaticTrackingEnable(state)
  }
})

const automaticTrackingNotification = computed({
  get() {
    return store.automaticTrackingNotification
  },
  set(state) {
    store.setAutomaticTrackingNotification(state)
  }
})

const automaticTrackingDelay = computed({
  get() {
    return store.automaticTrackingDelay
  },
  set(delay) {
    store.setAutomaticTrackingDelay(delay)
  }
})

const testNotification = () => {
  sendNotification('(example) Updated:', '- Mod #1 \n- Mod #2 \n- Mod #3')
}
</script>

<template>
  <div>
    <v-dialog
      v-model="dialog"
      max-width="700px"
    >
      <v-card title="Settings">
        <v-card-text>
          <h2>Notification</h2>
          <v-checkbox
            density="compact"
            v-model="automaticTrackingNotification"
            label="Enable notification (system popup window with sound) when any version(mod/spt) of mod is updated"
            hide-details
          >
            <template #append>
              <v-btn
                v-if="automaticTrackingNotification"
                color="success"
                @click="testNotification"
              >
                TEST NOTIFICATION
              </v-btn>
            </template>
          </v-checkbox>

          <h2 class="mt-10"> Auto-tracking </h2>

          <v-checkbox
            density="compact"
            v-model="automaticTrackingEnable"
            label="Enable tracking"
            hide-details
          ></v-checkbox>

          <v-slider
            density="compact"
            v-model="automaticTrackingDelay"
            label="Delay in minutes"
            :max="180"
            :min="1"
            :ticks="[1, 30, 60, 90, 120, 150, 180]"
            show-ticks="always"
            tick-size="5"
            step="30"
          ></v-slider>

          <v-alert
            type="warning"
            v-if="automaticTrackingDelay === 1"
          >
            If you have many mods, I strongly recommend <b>NOT</b> selecting the
            minutely refresh option. If competing requests occur (an existing
            one isn't finished and a new one starts), the following may occur:
            loss of current data, duplication, or temporary Forge API
            limitations.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn
            variant="tonal"
            color="error"
            @click="dialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
