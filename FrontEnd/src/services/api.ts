const API_BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.statusText}`)
  }

  return response.json()
}

export { apiRequest }
