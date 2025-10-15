//import axios from 'axios'

const token = 'vDRO4vrJh8xfh0mn1OWAcXsa03hU5Tp3b9D5wS1Xd0219105'

const wait = async (ms: number = 2000) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export const getVersions = async (id: number, page: number = 1) => {
  await wait()

  const url = `https://forge.sp-tarkov.com/api/v0/mod/${id}/versions?page=${page}`

  const urlWithParams = new URL(url)
  urlWithParams.searchParams.append(
    'fields',
    'id,version,spt_version_constraint'
  )

  const response = await fetch(urlWithParams.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export const getMods = async (ids: string, page: number = 1) => {
  await wait()
  const url = `https://forge.sp-tarkov.com/api/v0/mods?page=${page}`

  const urlWithParams = new URL(url)
  urlWithParams.searchParams.append('filter[id]', ids)
  urlWithParams.searchParams.append('fields', 'id,name,detail_url')

  const response = await fetch(urlWithParams.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
