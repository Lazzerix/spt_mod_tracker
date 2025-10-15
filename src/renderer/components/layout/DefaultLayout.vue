<script setup lang="tsx">
import HeaderLayout from '@/renderer/components/layout/HeaderLayout.vue'
</script>

<template>
  <v-app theme="dark">
    <v-layout>
      <HeaderLayout />
      <v-main>
        <slot />
      </v-main>
    </v-layout>
  </v-app>
</template>
