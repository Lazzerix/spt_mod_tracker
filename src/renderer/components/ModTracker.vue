/* eslint-disable */
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getMods, getVersions } from '../utils/api'
import { SptMod, SptModHistory, useMainStore } from '@/renderer/store/main'
import { openExternal, sendNotification } from '@/renderer/utils'
import ModHistoryDialog from '@/renderer/components/ModHistoryDialog.vue'
import ModSettingsDialog from '@/renderer/components/ModSettingsDialog.vue'

const defaultSptVersion = '~4.0.1'
const store = useMainStore()
const modIdList = ref<string[]>([])
const modUrlForAdd = ref<string>('')
const currentVersionSpt = ref<string>(defaultSptVersion)
const loading = ref(false)

const loadingPages = ref(0)
const error = ref('')

const importExportString = ref('')
const token = ref('')

const showImportExport = ref(false)
const showSettings = ref(false)

const getModsByApi = async (
  modIdList: string[],
  page: number = 1
): Promise<SptMod[]> => {
  if (!modIdList || !modIdList.length) return []

  loadingPages.value = page

  const modRequest = await getMods(modIdList.join(','), page)
  const mods = modRequest?.data ?? []

  const sptMods: SptMod[] = []
  if (!mods.length) {
    return sptMods
  }

  for (const modId of modIdList) {
    if (!loading.value) break

    const mod: { id: number; name: string; detail_url: string } | undefined =
      mods.find((m) => m.id === Number.parseInt(modId))

    if (mod) {
      try {
        let result: {
          data: { version: string; spt_version_constraint: string }[]
          meta: { current_page: number; last_page: number }
        } = await getModVersionByApi(mod.id)

        store.setModLoading(mod.name)

        if (result.meta.last_page !== result.meta.current_page) {
          result = await getModVersionByApi(mod.id, result.meta.last_page)
        }

        let currentBestVer = result.data[0]
        // Check results for most compatible version
        for (let candidate of result.data) {
          // if candidate is more compatible candidate is the best version
          // if candidate and currentBestVer are equally compatible check if candidate is newer than currentBestVer if so candidate is the best version
          if (
            getVersionDiff(candidate.spt_version_constraint) <
              getVersionDiff(currentBestVer.spt_version_constraint) ||
            (getVersionDiff(candidate.spt_version_constraint) ===
              getVersionDiff(currentBestVer.spt_version_constraint) &&
              isModANewerThanModB(candidate, currentBestVer))
          ) {
            currentBestVer = candidate
          }
        }

        sptMods.push({
          name:
            mod.name.length > 50 ? mod.name.substring(0, 50) + '...' : mod.name,
          id: mod.id.toString(),
          spt_version: currentBestVer.spt_version_constraint,
          version: currentBestVer.version,
          url: mod?.detail_url
        } as SptMod)
      } catch (e) {
        console.warn(mod.id, e)
      }
    }
  }

  if (mods.length > 0 && loading.value) {
    return sptMods.concat(await getModsByApi(modIdList, page + 1))
  } else {
    return sptMods
  }
}

const isModANewerThanModB = (
  modA: { version: string; spt_version_constraint: string },
  modB: { version: string; spt_version_constraint: string }
): boolean => {
  let [modAMajor, modAMinor, modAPatch] = modA.version
    .replace(/[^\d.]/g, '')
    .split('.')
    .map(Number)
  let [modBMajor, modBMinor, modBPatch] = modB.version
    .replace(/[^\d.]/g, '')
    .split('.')
    .map(Number)

  // in case a mod doesn't have a minor or major version set it to 0 to prevent problems
  if (modAMinor === undefined || modAMinor === null) modAMinor = 0
  if (modAPatch === undefined || modAPatch === null) modAPatch = 0
  if (modBMinor === undefined || modBMinor === null) modBMinor = 0
  if (modBPatch === undefined || modBPatch === null) modBPatch = 0
  if (modAMajor > modBMajor) {
    return true
  }
  if (modAMinor > modBMinor) {
    return true
  }
  if (modAPatch > modBPatch) {
    return true
  }
  return false
}

const getVersionDiff = (modVersion: string | null | undefined): number => {
  try {
    if (!modVersion) return 100
    let [sptMajor, sptMinor, sptPatch] = currentVersionSpt.value
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    let [modMajor, modMinor, modPatch] = modVersion
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    // in case a mod doesn't have a minor or major version set it to 0 to prevent problems
    if (modMinor === undefined || modMinor === null) modMinor = 0
    if (modPatch === undefined || modPatch === null) modPatch = 0
    if (sptMajor === modMajor && sptMinor === modMinor && sptPatch === modPatch)
      return 0 //perfect
    if (sptMajor === modMajor && sptMinor === modMinor) return 1 //compatible
    if (sptMajor === modMajor) return 2 // possible problems

    return 3 //compatible
  } catch (e) {
    console.warn('Error from version diff', e)
  }
  return 3 //compatible
}

const getModVersionByApi = async (id: number, page: number = 1) => {
  return await getVersions(id, page)
}

const addMod = async (newMode: string | null | undefined) => {
  if (!newMode) return

  if (newMode.includes('https://forge.sp-tarkov.com')) {
    const newModId = newMode.split('/').slice(-2)[0]

    if (modIdList.value.includes(newModId)) {
      modUrlForAdd.value = ''
      return
    }

    modIdList.value.push(newMode.split('/').slice(-2)[0])
    localStorage.setItem('modUrlList', JSON.stringify(modIdList.value))

    await updateLoadedMods([newModId])
  }

  modUrlForAdd.value = ''
}

const removeMode = (idStringForRemove: string | undefined | null) => {
  if (idStringForRemove === null) return

  const copyLoadedMods = [...store.loadedMods]

  copyLoadedMods.splice(
    copyLoadedMods.indexOf(
      copyLoadedMods.find((m: SptMod) => m.id === idStringForRemove) as SptMod
    ),
    1
  )
  store.setLoadedMods(copyLoadedMods)

  modIdList.value.splice(
    modIdList.value.indexOf(
      modIdList.value.find(
        (idString: string) => idString === idStringForRemove
      ) as string
    ),
    1
  )

  localStorage.setItem('modUrlList', JSON.stringify(modIdList.value))
  loadModIdList()
}

/**
 * Compares the currently selected version with the passed mod version
 * @param modVersion mod version
 */
const getColorByVersionDiff = (
  modVersion: string | null | undefined
): 'success' | 'warning' | 'error' | 'info' => {
  try {
    if (!modVersion) return 'info'

    let [sptMajor, sptMinor, sptPatch] = currentVersionSpt.value
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    let [modMajor, modMinor, modPatch] = modVersion
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    if (modMinor === undefined || modMinor === null) modMinor = 0
    if (sptMajor === modMajor && sptMinor === modMinor && sptPatch === modPatch)
      return 'success'
    if (sptMajor === modMajor && sptMinor === modMinor) return 'success'
    if (sptMajor === modMajor) return 'warning'

    return 'error'
  } catch (e) {
    console.warn('Error from version diff', e)
  }

  return 'error'
}

const removeAllMods = () => {
  localStorage.removeItem('loadedMods')
  localStorage.removeItem('modUrlList')
  location.reload()
}

const exportMods = () => {
  importExportString.value = btoa(JSON.stringify(modIdList.value))
}

const importMods = (replace: boolean = true) => {
  if (importExportString.value) {
    const newIdMods = JSON.parse(atob(importExportString.value))

    if (replace) {
      localStorage.setItem('modUrlList', JSON.stringify(newIdMods))
    } else {
      localStorage.setItem(
        'modUrlList',
        JSON.stringify([...new Set(modIdList.value.concat(newIdMods))])
      )
    }

    store.setLoadedMods([])
    loadModIdList()
  }
}

const openSptForgeForApiKey = () => {
  openExternal('https://forge.sp-tarkov.com/user/api-tokens')
}

const signIn = () => {
  if (!localStorage.getItem('token')) return

  store.setToken(localStorage.getItem('token'))
  loadModIdList()
}

const signUp = () => {
  localStorage.setItem('token', token.value)
  store.setToken(token.value)
  loadModIdList()
}

const logout = () => {
  localStorage.removeItem('token')
  store.setToken(null)
}

const loadModIdList = () => {
  modIdList.value = JSON.parse(localStorage.getItem('modUrlList') ?? '[]')
}

const loadCurrentSptVersion = () => {
  currentVersionSpt.value =
    localStorage.getItem('currentVersionSpt') ?? defaultSptVersion
}

onMounted(async () => {
  signIn()

  if (!store.token) return

  store.loadAutomaticTrackingEnable()
  store.loadAutomaticTrackingDelay()
  store.loadAutomaticTrackingNotification()
  store.loadUpdateOnAppStart()

  loadCurrentSptVersion()
  loadModIdList()
  toggleAutomaticTrackingInterval()

  if (store.updateOnAppStart) {
    setTimeout(() => {
      updateLoadedMods(modIdList.value)
    }, 100)
  }
})

const forceUpdateOutdatedMods = async () => {
  const modIdsForUpdate = store.loadedMods
    .filter((mod: SptMod) => {
      return getColorByVersionDiff(mod.spt_version) !== 'success'
    })
    .map((mod: SptMod) => mod.id)

  await updateLoadedMods(modIdsForUpdate)
}

const updateLoadedMods = async (modIds: string[]) => {
  if (loading.value) {
    console.warn('update in process')
    return
  }

  const isInterval = store.automaticTrackingIntervalId !== null
  store.clearAutomaticTrackingIntervalId()

  loading.value = true
  try {
    store.setModLoading('')

    const updatedMods = modIds.length ? await getModsByApi(modIds) : []

    const modNamesForNotification: string[] = []
    let mergedMods = [] as SptMod[]
    mergedMods = mergedMods.concat(updatedMods)

    store.loadedMods.forEach((exist: SptMod) => {
      const updated = mergedMods.find((updated) => updated.id === exist.id)

      const isSptUpdate = updated?.spt_version !== exist.spt_version
      const isModUpdate = updated?.version !== exist.version

      if (updated && (isSptUpdate || isModUpdate)) {
        modNamesForNotification.push(updated.name)
        store.addToModHistory({
          mod: updated,
          updated: Date.now(),
          old_version: exist.version,
          new_version: updated.version,
          old_spt_version: exist.spt_version,
          new_spt_version: updated.spt_version
        } as SptModHistory)
      } else if (!updated) {
        mergedMods.push(exist)
      }
    })

    if (
      store.automaticTrackingNotification &&
      modNamesForNotification.length > 0
    ) {
      await sendNotification(
        'Updated:',
        modNamesForNotification.map((modName) => `- ${modName}`).join(' \n')
      )
    }

    store.setLoadedMods(mergedMods)
  } catch (e) {
    console.log('error', e)
    error.value = errorToJSON(e)
  }

  loading.value = false
  if (isInterval) toggleAutomaticTrackingInterval()
}

const toggleAutomaticTrackingInterval = () => {
  if (!store.automaticTrackingEnable) return

  if (store.automaticTrackingIntervalId) {
    store.clearAutomaticTrackingIntervalId()
  } else {
    store.setAutomaticTrackingIntervalId(
      window.setInterval(
        () => updateLoadedMods(modIdList.value),
        store.automaticTrackingDelay * 60 * 1000
      )
    )
  }
}

watch(
  () => showImportExport.value,
  () => {
    if (showImportExport.value) exportMods()
  }
)

watch(
  () => currentVersionSpt.value,
  () => {
    localStorage.setItem('currentVersionSpt', currentVersionSpt.value)
  }
)

watch(
  () => modIdList,
  async () => {
    try {
      const loadedModsString = localStorage.getItem('loadedMods')
      store.setLoadedMods(
        JSON.parse(
          loadedModsString && loadedModsString.length > 0
            ? loadedModsString
            : '[]'
        )
      )

      if (store.loadedMods.length) {
        return
      }

      await updateLoadedMods(modIdList.value)

      loading.value = true
      const emptyMods: SptMod[] = []

      modIdList.value.forEach((modId) => {
        if (!store.loadedMods.find((m: SptMod) => modId === m.id)) {
          emptyMods.push({
            name: modId,
            id: modId
          } as SptMod)
        }
      })

      store.setLoadedMods(store.loadedMods.concat(emptyMods))

      localStorage.setItem('loadedMods', JSON.stringify(store.loadedMods))

      loading.value = false
    } catch (e) {
      console.log('error', e)

      error.value = errorToJSON(e)
      loading.value = false
    }
  },
  { deep: true }
)

function errorToJSON(error: unknown): string {
  if (error instanceof Error) {
    const errorObj = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').map((line) => line.trim()),
      additionalInfo: error
    }
    return JSON.stringify(errorObj, null, 2)
  }
  return JSON.stringify({ value: String(error) }, null, 2)
}
</script>

<template>
  <v-container class="mt-0">
    <div>
      <div>
        <v-card
          class="pa-2 d-flex justify-lg-space-between"
          color="surface-variant"
          rounded="lg"
          variant="tonal"
        >
          <div
            class="d-flex"
            v-if="store.token"
          >
            <div class="d-flex">
              <v-btn class="mr-4">
                <span class="utf-icon">☰</span>
                <v-menu activator="parent">
                  <v-list>
                    <v-list-item>
                      <v-btn
                        color="warning"
                        text="Settings"
                        variant="tonal"
                        @click="showSettings = true"
                      />
                    </v-list-item>
                    <v-list-item>
                      <v-btn
                        color="warning"
                        text="Export / Import / Remove"
                        variant="tonal"
                        @click="showImportExport = true"
                      />
                    </v-list-item>

                    <v-list-item class="mt-2">
                      <v-btn
                        v-if="store.token"
                        color="error"
                        variant="tonal"
                        @click="logout"
                      >
                        Logout
                      </v-btn>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-btn>

              <v-badge
                v-if="store.automaticTrackingEnable"
                offset-x="20"
                offset-y="8"
                :color="store.automaticTrackingIntervalId ? 'info' : 'error'"
                stacked
                :content="
                  store.automaticTrackingIntervalId
                    ? `${store.automaticTrackingDelay}m`
                    : ''
                "
              >
                <v-btn
                  class="mr-2"
                  :loading="loading"
                  @click="toggleAutomaticTrackingInterval"
                  v-tooltip="
                    `update all mods every ${store.automaticTrackingDelay}m`
                  "
                  :color="
                    store.automaticTrackingIntervalId ? 'success' : 'error'
                  "
                  variant="flat"
                >
                  ⏰
                </v-btn>
              </v-badge>

              <v-btn
                :disabled="store.automaticTrackingIntervalId != null"
                v-tooltip:bottom="'update all mods'"
                :loading="loading"
                class="mr-2"
                color="success"
                variant="tonal"
                @click="updateLoadedMods(modIdList)"
              >
                <span class="font-weight-bold">⟳</span>
              </v-btn>

              <v-btn
                :disabled="store.automaticTrackingIntervalId != null"
                v-tooltip:bottom="'update only old version mods'"
                :loading="loading"
                class="mr-2"
                color="warning"
                variant="tonal"
                @click="forceUpdateOutdatedMods"
              >
                <span class="font-weight-bold">⟳</span>
              </v-btn>

              <v-text-field
                v-model="modUrlForAdd"
                width="250px"
                class="mr-2"
                variant="outlined"
                density="compact"
                label="Mod URL"
                placeholder="https://forge.sp-tarkov.com/mod/1275/pity-loot"
                hide-details
              />
            </div>
            <v-btn
              class="mr-2"
              color="success"
              text="Add"
              variant="tonal"
              @click="addMod(modUrlForAdd)"
            />

            <ModHistoryDialog />
          </div>

          <div>
            <div class="ml-5 d-flex flex-row">
              <div class="mr-2 d-flex flex-row">
                <v-text-field
                  v-if="!store.token"
                  v-model="token"
                  width="300px"
                  class="mr-2"
                  variant="outlined"
                  density="compact"
                  label='API KEY with  "read" permission'
                >
                  <template #details>
                    <a
                      href="#"
                      @click="openSptForgeForApiKey"
                      >get api key from spt-forge</a
                    >
                  </template>
                </v-text-field>
                <v-btn
                  v-if="!store.token"
                  color="success"
                  variant="tonal"
                  @click="signUp"
                >
                  Login
                </v-btn>
              </div>

              <v-text-field
                v-if="store.token"
                v-model="currentVersionSpt"
                width="300px"
                class="mr-2"
                variant="outlined"
                density="compact"
                label="Current version SPT"
                hide-details
              />
            </div>
          </div>
        </v-card>
        <v-card
          v-if="showImportExport"
          class="mt-0 pa-2"
          color="surface-variant"
          variant="tonal"
        >
          <v-card-title>
            Export / Import
            <v-btn
              class="ml-2"
              color="error"
              variant="tonal"
              @click="showImportExport = false"
            >
              Close
            </v-btn>
          </v-card-title>
          <v-textarea
            variant="outlined"
            v-model="importExportString"
            hint="This encoded string is needed to quickly import your mod pack"
            persistent-hint
          />
          <v-card-actions>
            <v-btn
              color="warning"
              text="Export"
              variant="tonal"
              @click="exportMods"
            />
            <v-btn
              :disabled="!importExportString"
              color="warning"
              text="Import (add)"
              variant="tonal"
              @click="importMods(false)"
            />
            <v-btn
              :disabled="!importExportString"
              color="warning"
              text="Import (replace)"
              variant="tonal"
              @click="importMods(true)"
            />
            <v-btn
              color="error"
              text="REMOVE ALL MODS"
              variant="tonal"
              @click="removeAllMods"
            />
          </v-card-actions>
        </v-card>
      </div>

      <div>
        <v-card
          class="mt-2 pa-2"
          style="column-count: 2"
          color="surface-variant"
          rounded="lg"
          variant="tonal"
        >
          <template v-if="store.loadedMods.length">
            <div
              class="mb-1"
              v-for="mod in store.loadedMods"
              :key="mod.name"
            >
              <v-chip
                class="mr-2"
                :color="getColorByVersionDiff(mod.spt_version)"
                variant="flat"
              >
                {{ mod?.spt_version ? mod?.spt_version : '??????' }}
              </v-chip>
              <a
                href="#"
                @click="openExternal(mod.url as string)"
              >
                {{ mod.name }} ({{ mod.version }})
              </a>
              <v-chip
                color="error"
                @click="removeMode(mod.id)"
                icon
                size="small"
              >
                x
              </v-chip>
            </div>
          </template>
          <span v-else-if="!store.token"
            >Must login before tracking spt mods</span
          >
          <span v-else-if="!modIdList.length">Add at least one mod</span>
          <span v-if="store.token && loading && modIdList.length > 0">
            <v-progress-circular indeterminate />
            page {{ loadingPages }} {{ store.modLoading }}
          </span>
        </v-card>
      </div>
      <v-alert
        class="mt-2"
        v-if="error"
        variant="flat"
        type="error"
      >
        <v-textarea
          auto-grow
          v-model="error"
        />
      </v-alert>
    </div>
    <ModSettingsDialog v-model:dialog="showSettings" />
  </v-container>
</template>

<style>
.v-btn {
  height: 40px !important;
}
.utf-icon {
  font-saize: 30px;
}
</style>
