/* eslint-disable */
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getMods, getVersions } from '../utils/api'
import { useMainStore } from '@/renderer/store/main'
import { openExternal } from '@/renderer/utils'

interface SptMod {
  id: string
  name: string
  url?: string
  spt_version?: string
  version?: string
}

const defaultSptVersion = '~4.0.1'
const store = useMainStore()
const modIdList = ref<string[]>([])
const modUrlForAdd = ref<string>('')
const modList = ref<SptMod[]>([])
const currentVersionSpt = ref<string>(defaultSptVersion)
const lastModLength = ref(-1)
const loading = ref(false)

const loadingPages = ref(0)

const importExport = ref('')
const token = ref('')

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

  if (mods.length > 0) {
    return sptMods.concat(await getModsByApi(modIdList, page + 1))
  } else {
    return sptMods
  }
}

const getModVersionByApi = async (id: number, page: number = 1) => {
  return await getVersions(id, page)
}

const addMod = (newMode: string | null | undefined) => {
  if (!newMode) return

  if (newMode.includes('https://forge.sp-tarkov.com')) {
    modIdList.value.push(newMode.split('/').slice(-2)[0])
    localStorage.setItem('modUrlList', JSON.stringify(modIdList.value))
  }

  modUrlForAdd.value = ''
}

const removeMode = (idStringForRemove: string | undefined | null) => {
  if (idStringForRemove === null) return

  modList.value.splice(
    modList.value.indexOf(
      modList.value.find((m: SptMod) => m.id === idStringForRemove) as SptMod
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

const getColorByVersionDiff = (
  modVersion: string | null | undefined
): 'success' | 'warning' | 'error' | 'info' => {
  try {
    if (!modVersion) return 'info'

    const currentVersionSplit = currentVersionSpt.value.split('.')
    const modVersionSplit = modVersion.split('.')

    currentVersionSplit[0] = currentVersionSplit[0].replace('~', '')
    modVersionSplit[0] = modVersionSplit[0].replace('~', '')

    const isMajorEqual = currentVersionSplit[0] === modVersionSplit[0]
    const isMinorEqual = currentVersionSplit[1] === modVersionSplit[1]
    const isPatchEqual = currentVersionSplit[2] === modVersionSplit[2]

    if (isMajorEqual && isMinorEqual && isPatchEqual) {
      return 'success'
    } else if (isMajorEqual && isMinorEqual) {
      return 'success'
    } else if (isMajorEqual) {
      return 'warning'
    }
  } catch (e) {
    console.warn('Error from version diff', e)
  }

  return 'error'
}

const exportMods = () => {
  importExport.value = btoa(JSON.stringify(modIdList.value))
}

const importMods = () => {
  localStorage.setItem('modUrlList', atob(importExport.value))
}

const openSptForgeForApiKey = () => {
  openExternal('https://forge.sp-tarkov.com/user/api-tokens')
}

const signIn = () => {
  if (!localStorage.getItem('token')) return

  store.setToken(localStorage.getItem('token'))
  loadModList()
}

const signUp = () => {
  localStorage.setItem('token', token.value)
  store.setToken(token.value)
  loadModList()
}

const logout = () => {
  localStorage.removeItem('token')
  modList.value = []
  store.setToken(null)
}

const loadModList = () => {
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
  loadModList()
})

watch(
  () => currentVersionSpt.value,
  () => {
    localStorage.setItem('currentVersionSpt', currentVersionSpt.value)
  }
)

watch(
  () => modIdList,
  async () => {
    if (lastModLength.value >= modIdList.value.length && modList.value.length) {
      lastModLength.value = modIdList.value.length
      return
    }

    loading.value = true
    modList.value = await getModsByApi(modIdList.value)

    const emptyMods: SptMod[] = []

    modIdList.value.forEach((modId) => {
      if (!modList.value.find((m) => modId === m.id)) {
        emptyMods.push({
          name: modId,
          id: modId
        } as SptMod)
      }
    })

    modList.value = modList.value.concat(emptyMods)
    modList.value.sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id))

    lastModLength.value = modList.value.length
    loading.value = false
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
            <div>
              <v-text-field
                v-model="modUrlForAdd"
                width="500px"
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
            <v-btn
              class="ml-2"
              color="warning"
              text="Export"
              variant="tonal"
              @click="exportMods"
            />
            <v-btn
              class="ml-2"
              color="warning"
              text="Import"
              variant="tonal"
              @click="importMods"
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
                <v-btn
                  :disabled="!token"
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
              <v-btn
                :disabled="loading"
                v-if="store.token"
                color="error"
                variant="tonal"
                @click="logout"
                >Logout</v-btn
              >
            </div>
          </div>
        </v-card>
        <v-card
          v-if="importExport.length"
          class="mt-0 pa-2"
          color="surface-variant"
          variant="tonal"
          title="Export/Import"
        >
          <v-textarea
            variant="outlined"
            v-model="importExport"
            hint="This encoded string is needed to quickly import your mod pack"
            persistent-hint
          />
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
          <template v-if="modList.length">
            <div
              class="mb-1"
              v-for="mod in modList"
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
                :href="mod.url"
                target="_blank"
                >{{ mod.name }} ({{ mod.version }})</a
              >
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
