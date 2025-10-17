import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMainStore = defineStore('main', () => {
  //spt forge api token
  const token = ref<string | null>('')
  // current mod on loading
  const modLoading = ref('')

  function setModLoading(m: string) {
    modLoading.value = m
  }

  function setToken(t: string | null) {
    token.value = t
  }

  return {
    token,
    setToken,

    modLoading,
    setModLoading
  }
})
