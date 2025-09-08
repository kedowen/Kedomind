import { TOKEN, REFRESH_TOKEN } from '@/types'
export const useStorage = () => {
  const getToken = () => {
    return localStorage.getItem(TOKEN)
  }
  const setToken = (token: string) => {
    localStorage.setItem(TOKEN, token)
  }

  const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN)
  }

  const setRefreshToken = (refreshToken: string) => {
    localStorage.setItem(REFRESH_TOKEN, refreshToken)
  }

  const clearAll = () => {
    localStorage.removeItem(TOKEN)
    localStorage.removeItem(REFRESH_TOKEN)
  }

  return {
    getToken,
    setToken,
    getRefreshToken,
    setRefreshToken,
    clearAll
  }
}