import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SptMod {
  //mod id
  id: string
  //mod name
  name: string
  //spt forge url
  url?: string
  //spt version compatibility
  spt_version?: string
  //mod version
  version?: string
}

export interface SptModHistory {
  //mod
  mod: SptMod
  //when mod updated
  updated: number
  // old mod version
  old_version?: string
  // new mod version
  new_version?: string
  // old spt version
  old_spt_version?: string
  // spt version compatibility
  new_spt_version?: string
}

export const useMainStore = defineStore('main', () => {
  //spt forge api token
  const token = ref<string | null>('')
  // current mod on loading
  const modLoading = ref('')
  // mods that were already downloaded via the API
  const loadedMods = ref<SptMod[]>([])
  // update history
  const modHistory = ref<SptModHistory[]>([])

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

  function addToModHistory(history: SptModHistory) {
    modHistory.value.push(history)
  }

  return {
    token,
    setToken,

    modLoading,
    setModLoading,

    loadedMods,
    setLoadedMods,

    modHistory,
    addToModHistory
  }
})
