//import axios from 'axios'

const token = 'vDRO4vrJh8xfh0mn1OWAcXsa03hU5Tp3b9D5wS1Xd0219105'
export const getVersions = async (id: number, page: number = 1) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))

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
  await new Promise((resolve) => setTimeout(resolve, 1000))
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

/**
 *
 * app.get('/api/mods', async (req, res) => {
 *   try {
 *     const { id,page } = req.query;
 *
 *     if (!id) {
 *       return res.status(400).json({ error: 'Не указан параметр id' });
 *     }
 *
 *     // Формируем URL с параметрами (filter[id]=1,2,3)
 *     const url = `https://forge.sp-tarkov.com/api/v0/mods?page=${page ? page : 1}`;
 *
 *     // Делаем запрос к Forge API с фильтром
 *     const response = await axios.get(url, {
 *       params: {
 *         'filter[id]': id, // Передаем ID как filter[id]=1,2,3
 *        'fields': 'id,name,detail_url'
 *       },
 *       headers: {
 *         'Accept': 'application/json',
 *         'Authorization': `Bearer ${token}`,
 *       },
 *     });
 *
 *     // Возвращаем ответ от Forge API как есть
 *     res.json(response.data);
 *
 *   } catch (error) {
 *     console.error("Ошибка:", error);
 *     res.status(500).json({
 *       error: 'Ошибка при запросе к Forge API',
 *       details: error.message,
 *     });
 *   }
 * });
 */
