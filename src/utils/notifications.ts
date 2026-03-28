import { toast } from 'react-hot-toast'
import { playNotificationSound } from './audio'
import { useUIStore } from '@/store/uiStore'

type NotifyVariant = 'success' | 'error' | 'info'

interface NotifyOptions {
  title: string
  message?: string
  variant?: NotifyVariant
  playSound?: boolean
}

const getToastMessage = (title: string, message?: string) => (message ? `${title}\n${message}` : title)

export const notifyPopup = ({
  title,
  message,
  variant = 'info',
  playSound = true,
}: NotifyOptions) => {
  if (playSound) playNotificationSound()

  const toastMessage = getToastMessage(title, message)
  if (variant === 'success') toast.success(toastMessage)
  else if (variant === 'error') toast.error(toastMessage)
  else toast(toastMessage)

  useUIStore.getState().addNotification({ title, message, variant })

  // Browser-level popup notification (when user granted permission).
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message || '' })
  }
}

export const requestBrowserNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch (error) {
      console.error('Notification permission request failed', error)
    }
  }
}
