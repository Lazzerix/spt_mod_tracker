<script setup lang="tsx">
const reloadApp = () => {
  location.reload()
}
</script>

<template>
  <v-app-bar
    color="primary"
    density="compact"
  >
    <v-app-bar-title>SPT Mod Tracker</v-app-bar-title>
    <v-btn
      v-tooltip:bottom="'reload app'"
      class="mr-2"
      color="success"
      variant="flat"
      @click="reloadApp"
      ><span class="font-weight-bold">⟳</span></v-btn
    >
  </v-app-bar>
</template>
