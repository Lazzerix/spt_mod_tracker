/* eslint-disable */
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getMods, getVersions } from '../utils/api'
import { SptMod, useMainStore } from '@/renderer/store/main'
import { openExternal } from '@/renderer/utils'

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

        const version = result.data[result.data.length - 1]

        sptMods.push({
          name:
            mod.name.length > 50 ? mod.name.substring(0, 50) + '...' : mod.name,
          id: mod.id.toString(),
          spt_version: version.spt_version_constraint,
          version: version.version,
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

  store.loadedMods.splice(
    store.loadedMods.indexOf(
      store.loadedMods.find((m: SptMod) => m.id === idStringForRemove) as SptMod
    ),
    1
  )
  modIdList.value.splice(
    modIdList.value.indexOf(
      modIdList.value.find(
        (idString: string) => idString === idStringForRemove
      ) as string
    ),
    1
  )

  localStorage.setItem('modUrlList', JSON.stringify(modIdList.value))
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

    const [major1, minor1, patch1] = currentVersionSpt.value
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    const [major2, minor2, patch2] = modVersion
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number)

    if (major1 === major2 && minor1 === minor2 && patch1 === patch2)
      return 'success'
    if (major1 === major2 && minor1 === minor2) return 'success'
    if (major1 === major2) return 'warning'

    return 'error'
  } catch (e) {
    console.warn('Error from version diff', e)
  }

  return 'error'
}

const exportMods = () => {
  importExportString.value = btoa(JSON.stringify(modIdList.value))
}

const importMods = () => {
  if (importExportString.value) {
    localStorage.setItem('modUrlList', atob(importExportString.value))
    updateLoadedMods(modIdList.value)
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
  loadCurrentSptVersion()
  loadModIdList()
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
  loading.value = true
  try {
    const updatedMods = await getModsByApi(modIds)
    let mergedMods = [] as SptMod[]
    mergedMods = mergedMods.concat(updatedMods)

    store.loadedMods.forEach((exist: SptMod) => {
      if (!mergedMods.find((updated) => updated.id === exist.id)) {
        mergedMods.push(exist)
      }
    })

    store.setLoadedMods(mergedMods)

    localStorage.setItem('loadedMods', JSON.stringify(store.loadedMods))
  } catch (e) {
    console.log('error', e)
    error.value = e as string
  }
  loading.value = false
}

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
      error.value = e as string
      loading.value = false
    }
  },
  { deep: true }
)
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
              <v-btn class="mr-2">
                <span class="utf-icon">☰</span>
                <v-menu activator="parent">
                  <v-list>
                    <v-list-item>
                      <v-btn
                        color="warning"
                        text="Export/Import"
                        variant="tonal"
                        @click="showImportExport = true"
                      />
                    </v-list-item>

                    <v-list-item class="mt-2">
                      <v-btn
                        :disabled="!token"
                        v-if="!store.token"
                        color="success"
                        variant="tonal"
                        @click="signUp"
                      >
                        Login
                      </v-btn>
                      <v-btn
                        v-else
                        color="error"
                        variant="tonal"
                        @click="logout"
                        >Logout</v-btn
                      >
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-btn>

              <v-btn
                v-tooltip:bottom="'update all mods'"
                :loading="loading"
                class="mr-2"
                color="success"
                variant="tonal"
                @click="updateLoadedMods(modIdList)"
                ><span class="font-weight-bold">⟳</span></v-btn
              >

              <v-btn
                v-tooltip:bottom="'update only old version mods'"
                :loading="loading"
                class="mr-2"
                color="warning"
                variant="tonal"
                @click="forceUpdateOutdatedMods"
                ><span class="font-weight-bold">⟳</span></v-btn
              >

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
              color="success"
              text="Add"
              variant="tonal"
              @click="addMod(modUrlForAdd)"
            />
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
                  <template #details
                    ><a
                      href="#"
                      @click="openSptForgeForApiKey"
                      >get api key from spt-forge</a
                    ></template
                  >
                </v-text-field>
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
          title="Export/Import"
        >
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
              text="Import"
              variant="tonal"
              @click="importMods"
            />
            <v-btn
              class="ml-2"
              color="error"
              variant="tonal"
              @click="showImportExport = false"
            >
              Close
            </v-btn>
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
        v-if="error"
        variant="flat"
        type="error"
        >{{ error }}</v-alert
      >
    </div>
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
