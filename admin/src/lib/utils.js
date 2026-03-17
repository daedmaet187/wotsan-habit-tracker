import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Never'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return 'Just now'

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'Just now'
  if (diffMs < hour) {
    const mins = Math.floor(diffMs / minute)
    return `${mins} minute${mins === 1 ? '' : 's'} ago`
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.floor((todayStart.getTime() - dateStart.getTime()) / day)

  if (dayDiff === 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff} days ago`
  if (dayDiff < 30) {
    const weeks = Math.floor(dayDiff / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }

  const months = Math.floor(dayDiff / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(dayDiff / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
