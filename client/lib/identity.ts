// Identity Management - localStorage-based pId per session

export const DEVICE_ID_KEY = 'milkteaDeviceId'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(DEVICE_ID_KEY) || ''
}

export function getParticipantId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem(`pId_${sessionId}`)
  if (id === 'undefined' || id === 'null' || !id) return null
  return id
}

export function setParticipantId(sessionId: string, participantId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`pId_${sessionId}`, participantId)
}

export function clearParticipantId(sessionId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`pId_${sessionId}`)
}

export function isHost(hostDeviceId: string): boolean {
  if (typeof window === 'undefined') return false
  const deviceId = getOrCreateDeviceId()
  return deviceId === hostDeviceId
}

export function saveHostSecret(slug: string, secret: string): void {
  if (typeof window === 'undefined') return
  const secrets = JSON.parse(localStorage.getItem('host_secrets') || '{}')
  secrets[slug] = secret
  localStorage.setItem('host_secrets', JSON.stringify(secrets))
}

export function getHostSecret(slug: string): string | null {
  if (typeof window === 'undefined') return null
  const secrets = JSON.parse(localStorage.getItem('host_secrets') || '{}')
  return secrets[slug] || null
}
