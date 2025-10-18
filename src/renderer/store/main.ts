import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SptMod {
  id: string
  name: string
  url?: string
  spt_version?: string
  version?: string
}

export const useMainStore = defineStore('main', () => {
  //spt forge api token
  const token = ref<string | null>('')
  // current mod on loading
  const modLoading = ref('')
  // mods that were already downloaded via the API
  const loadedMods = ref<SptMod[]>([])

  function setModLoading(m: string) {
    modLoading.value = m
  }

  function setToken(t: string | null) {
    token.value = t
  }

  function setLoadedMods(mods: SptMod[]) {
    loadedMods.value = mods
    loadedMods.value.sort(
      (a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)
    )

    localStorage.setItem('loadedMods', JSON.stringify(loadedMods.value))
  }

  return {
    token,
    setToken,

    modLoading,
    setModLoading,

    loadedMods,
    setLoadedMods
  }
})
