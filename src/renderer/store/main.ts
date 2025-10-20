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
  // automatic tracker interval id
  const automaticTrackingIntervalId = ref<number | null>(null)

  //settings
  const automaticTrackingEnable = ref<boolean>(false)
  const automaticTrackingNotification = ref<boolean>(false)
  const automaticTrackingDelay = ref<number>(30)

  function setAutomaticTrackingIntervalId(timeoutId: number) {
    automaticTrackingIntervalId.value = timeoutId
  }

  function clearAutomaticTrackingIntervalId() {
    if (!automaticTrackingIntervalId.value) return

    clearInterval(automaticTrackingIntervalId.value as number)
    automaticTrackingIntervalId.value = null
  }

  function setAutomaticTrackingEnable(state: boolean) {
    automaticTrackingEnable.value = state
    localStorage.setItem(
      'automaticTrackingEnable',
      JSON.stringify(automaticTrackingEnable.value)
    )

    if (!state) {
      clearAutomaticTrackingIntervalId()
    }
  }
  function setAutomaticTrackingNotification(state: boolean) {
    automaticTrackingNotification.value = state
    localStorage.setItem(
      'automaticTrackingNotification',
      JSON.stringify(automaticTrackingEnable.value)
    )
  }
  function setAutomaticTrackingDelay(delay: number) {
    console.log('store setAutomaticTrackingDelay', delay)

    automaticTrackingDelay.value = delay > 1 && delay < 180 ? delay - 1 : delay
    localStorage.setItem(
      'automaticTrackingDelay',
      automaticTrackingDelay.value.toString()
    )

    clearAutomaticTrackingIntervalId()
  }

  function loadAutomaticTrackingEnable() {
    const state: boolean = localStorage.getItem('automaticTrackingEnable')
      ? JSON.parse(localStorage.getItem('automaticTrackingEnable') as string)
      : false

    automaticTrackingEnable.value = state
  }
  function loadAutomaticTrackingNotification() {
    const state: boolean = localStorage.getItem('automaticTrackingNotification')
      ? JSON.parse(
          localStorage.getItem('automaticTrackingNotification') as string
        )
      : false

    automaticTrackingNotification.value = state
  }
  function loadAutomaticTrackingDelay() {
    const delay: number = localStorage.getItem('automaticTrackingDelay')
      ? Number.parseInt(
          localStorage.getItem('automaticTrackingDelay') as string
        )
      : 30

    automaticTrackingDelay.value = delay
  }

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
    addToModHistory,

    automaticTrackingEnable,
    setAutomaticTrackingEnable,
    loadAutomaticTrackingEnable,

    automaticTrackingNotification,
    setAutomaticTrackingNotification,
    loadAutomaticTrackingNotification,

    automaticTrackingDelay,
    setAutomaticTrackingDelay,
    loadAutomaticTrackingDelay,

    automaticTrackingIntervalId,
    setAutomaticTrackingIntervalId,
    clearAutomaticTrackingIntervalId
  }
})
