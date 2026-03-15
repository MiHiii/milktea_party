// Identity Management - localStorage-based p_id per session

const DEVICE_ID_KEY = 'milktea_device_id'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      // crypto.randomUUID only works in secure contexts (HTTPS)
      // We use it if available, or fallback to a simple random string for compatibility
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID()
      } else {
        id = 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11)
      }
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch (e) {
    console.warn('localStorage not available', e)
    return 'temp-' + Math.random().toString(36).substring(2, 11)
  }
}

export function getParticipantId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem(`p_id_${sessionId}`)
  if (id === 'undefined' || id === 'null' || !id) return null
  return id
}

export function setParticipantId(sessionId: string, participantId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`p_id_${sessionId}`, participantId)
}

export function clearParticipantId(sessionId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`p_id_${sessionId}`)
}

export function isHost(hostDeviceId: string): boolean {
  if (typeof window === 'undefined') return false
  const deviceId = getOrCreateDeviceId()
  return deviceId === hostDeviceId
}
