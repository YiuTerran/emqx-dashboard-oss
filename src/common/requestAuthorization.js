import axios, { AxiosHeaders } from 'axios'

export function setApiAuthorization(config, token, apiBaseURL, documentURL) {
  const target = new URL(axios.getUri(config), documentURL)
  const api = new URL(`${apiBaseURL.replace(/\/+$/, '')}/`, documentURL)
  const isApiRequest =
    target.origin === api.origin &&
    (target.pathname === api.pathname.slice(0, -1) || target.pathname.startsWith(api.pathname))

  config.headers = AxiosHeaders.from(config.headers)
  config.headers.delete('Authorization')
  if (isApiRequest && token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
}
