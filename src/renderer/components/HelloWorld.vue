/* eslint-disable */
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMods, getVersions } from '../utils/api'

interface SptMod {
  id: string
  name: string
  url?: string
  spt_version?: string
  version?: string
}

const router = useRouter()
const route = useRoute()
const modIdList = ref<string[]>([])
const modUrlForAdd = ref<string>('')
const modList = ref<SptMod[]>([])
const currentVersionSpt = ref<string>('~4.0.0')
const lastModLength = ref(-1)
const loading = ref(false)
const loadingPages = ref(0)
const exportUrl = ref('')

const getModsByApi = async (
  modIdList: string[],
  page: number = 1
): Promise<SptMod[]> => {
  loadingPages.value = page

  const json = await getMods(modIdList.join(','), page)

  const sptMods: SptMod[] = []

  for (let i: number = 0; i < (json?.data ?? []).length; i++) {
    const mod: { id: number; name: string; detail_url: string } = json.data[i]

    try {
      let result: {
        data: { version: string; spt_version_constraint: string }[]
        meta: { current_page: number; last_page: number }
      } = await getModVersionByApi(mod.id)

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
        url: mod.detail_url
      } as SptMod)
    } catch (e) {
      console.warn(mod.id, e)
    }
  }

  if (sptMods.length > 0) {
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
  const encoded = btoa(JSON.stringify(modIdList.value))
  router.push({
    query: {
      mods: btoa(JSON.stringify(modIdList.value))
    }
  })

  exportUrl.value = `${location.origin}/?mods=${encoded}`
}

const modsFromUrl = computed(() => {
  const mods = route.query['mods']
  if (!mods?.length) {
    return []
  }

  return JSON.parse(atob(route.query['mods'] as string)) as string[]
})

const editMods = () => {
  localStorage.setItem('modUrlList', JSON.stringify(modsFromUrl.value))
  router.push({
    query: {}
  })
  exportUrl.value = ''
}

onMounted(async () => {
  if (modsFromUrl.value.length > 0) {
    modIdList.value = modsFromUrl.value
    //modList.value = await getModsByApi(modIdList.value)
  } else {
    modIdList.value = JSON.parse(localStorage.getItem('modUrlList') ?? '[]')
    //modList.value = await getModsByApi(modIdList.value)
  }
})

watch(
  () => modIdList,
  async () => {
    if (lastModLength.value >= modIdList.value.length) {
      lastModLength.value = modIdList.value.length
      return
    }

    loading.value = true
    modList.value = await getModsByApi(modIdList.value)

    lastModLength.value = modList.value.length
    loading.value = false
  },
  { deep: true }
)
</script>

<template>
  <v-container
    class="mt-0"
    max-width="1200"
  >
    <div>
      <div class="mb-8 text-center">
        <h1 class="text-h2 font-weight-bold"> SPT MOD Version Track </h1>
      </div>

      <div>
        <v-card
          class="pa-2 d-flex justify-lg-space-between"
          color="surface-variant"
          rounded="lg"
          variant="tonal"
        >
          <div class="d-flex">
            <div>
              <v-text-field
                :disabled="modsFromUrl.length > 0"
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
              :disabled="modsFromUrl.length > 0"
              color="success"
              text="Add"
              variant="tonal"
              @click="addMod(modUrlForAdd)"
            />
            <v-btn
              :disabled="modsFromUrl.length > 0"
              class="ml-2"
              color="warning"
              text="Export"
              variant="tonal"
              @click="exportMods"
            />
            <v-btn
              v-if="modsFromUrl.length > 0"
              class="ml-2"
              color="warning"
              text="Edit"
              variant="tonal"
              @click="editMods"
            />
          </div>

          <div class="d-flex">
            <div class="ml-5">
              <v-text-field
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
          v-if="exportUrl.length"
          class="mt-0 pa-2"
          color="surface-variant"
          variant="tonal"
          title="Export"
        >
          <v-textarea
            variant="outlined"
            v-model="exportUrl"
            hint="You can share a link to your mod set"
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
          <span v-else-if="!modIdList.length">Add at least one mod</span>
          <span v-if="loading && modIdList.length > 0">
            <v-progress-circular indeterminate />
            page {{ loadingPages }}
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
</style>
