type RequestOptions = RequestInit & {
  token?: string | null
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${baseUrl}${path}`
}

const parseError = async (response: Response) => {
  let message = 'Đã xảy ra lỗi, vui lòng thử lại.'

  try {
    const data = await response.json()
    message = data.message ?? data.error ?? message
  } catch {
    const text = await response.text()
    if (text) {
      message = text
    }
  }

  throw new Error(message)
}

export const httpClient = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { token, headers, body, method, ...rest } = options

  const isJsonBody = body !== undefined && !(body instanceof FormData)

  const response = await fetch(buildUrl(path), {
    method: method ?? 'GET',
    body,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  })

  if (!response.ok) {
    await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  try {
    return (await response.json()) as T
  } catch {
    return undefined as T
  }
}

export const httpClientBlob = async (path: string, options: RequestOptions = {}): Promise<Blob> => {
  const { token, headers, method, ...rest } = options

  const response = await fetch(buildUrl(path), {
    method: method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  })

  if (!response.ok) {
    await parseError(response)
  }

  return await response.blob()
}


