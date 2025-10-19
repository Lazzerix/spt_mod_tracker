<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMainStore } from '@/renderer/store/main'
import { openExternal } from '@/renderer/utils'

const dialog = ref(false)
const store = useMainStore()
const notification = ref(false)

const formatDate = (milliseconds: number) => {
  const date = new Date(milliseconds)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day}.${month} ${hours}:${minutes}`
}

watch(
  () => store.modHistory.length,
  () => {
    notification.value = true
  }
)

watch(
  () => dialog.value,
  () => {
    if (dialog.value) notification.value = false
  }
)
</script>

<template>
  <div>
    <v-badge
      v-if="notification"
      offset-x="5"
      offset-y="5"
      color="warning"
      stacked
      content="!"
    >
      <v-btn
        class="utf-icon glowing-element"
        color="success"
        variant="tonal"
        @click="dialog = !dialog"
      >
        🔔
      </v-btn>
    </v-badge>
    <v-btn
      v-else
      class="utf-icon"
      variant="flat"
      @click="dialog = !dialog"
    >
      🔔
    </v-btn>

    <v-dialog
      v-model="dialog"
      max-width="900px"
    >
      <v-card title="Notification">
        <v-card-text v-if="!store.modHistory.length"
          >There is nothing here at the moment</v-card-text
        >
        <v-card-text v-else>
          <v-banner
            class="cursor-pointer"
            v-for="history in store.modHistory"
            lines="one"
            :key="history.updated"
            @click="openExternal(history.mod.url as string)"
          >
            <template v-slot:default>
              <div class="d-flex flex-row justify-space-between w-100">
                <div class="w-50">
                  {{ history.mod.name }}
                </div>

                <div>
                  <v-chip>
                    <span v-if="history.old_version != history.new_version">
                      {{ history.old_version }} →
                      {{ history.new_version }}
                    </span>
                    <span v-else>
                      {{ history.new_version }}
                    </span>
                  </v-chip>
                  <v-chip>
                    <span
                      class="version-update"
                      v-if="history.old_spt_version != history.new_spt_version"
                    >
                      {{ history.old_spt_version }} →
                      {{ history.new_spt_version }}
                    </span>
                    <span v-else>
                      {{ history.new_spt_version }}
                    </span>
                  </v-chip>
                  <v-chip>
                    {{ formatDate(history.updated) }}
                  </v-chip>
                </div>
              </div>
            </template>
          </v-banner>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="error"
            variant="tonal"
            text="CLOSE"
            @click="dialog = false"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style>
.version-update {
  color: #7ff57f;
  font-weight: bold;
}

.glowing-element {
  box-shadow:
    0 0 1px #fff,
    0 0 2px #b45a5a,
    0 0 3px #5b962a,
    0 0 4px #703a7e,
    0 0 5px #717c3d,
    0 0 6px #ef0e52,
    0 0 7px #0ff;
}
</style>
