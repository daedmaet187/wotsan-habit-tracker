import axios from "axios"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function retryRequest(error, apiInstance, currentAttempt = 1, maxAttempts = 5) {
  if (currentAttempt > maxAttempts || error.response?.status !== 429) {
    return Promise.reject(error)
  }

  const baseDelay = 1000 * Math.pow(2, currentAttempt - 1)
  const jitter = Math.random() * 500
  const delay = Math.floor(baseDelay + jitter)

  console.warn(
    `[API Throttling] 429 received. Retrying in ${delay}ms... (Attempt ${currentAttempt}/${maxAttempts})`
  )

  await sleep(delay)

  try {
    return await apiInstance.request(error.config)
  } catch (retryError) {
    return retryRequest(retryError, apiInstance, currentAttempt + 1, maxAttempts)
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 429) {
      return retryRequest(error, api, 1, 5)
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)

export default api
