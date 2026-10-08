// Shared types for prototype review comments. Safe to import on client and server.

export interface ReviewComment {
  id: string
  author: string
  body: string
  /** Which screen the comment was left on, e.g. "payment/Settings/channels". */
  viewKey: string
  /** Human label for that screen, shown in the comment list. */
  viewLabel: string
  /** Horizontal anchor as a fraction of the app width, so it survives resizing. */
  xPct: number
  /** Vertical anchor in px from the top of the app. */
  yPx: number
  createdAt: string
  updatedAt?: string
}

export type NewComment = Omit<ReviewComment, "id" | "createdAt" | "updatedAt">

export interface StorageInfo {
  kind: "file"
  /** False on serverless, where the store is wiped on a cold start. */
  durable: boolean
}

export interface CommentsPayload {
  comments: ReviewComment[]
  storage: StorageInfo
}

export interface ViewTarget {
  categoryId: string
  item: string
  settingsView?: string
}

export function buildViewKey(t: ViewTarget): string {
  return t.item === "Settings"
    ? `${t.categoryId}/Settings/${t.settingsView ?? "home"}`
    : `${t.categoryId}/${t.item}`
}

export function parseViewKey(key: string): ViewTarget | null {
  const parts = key.split("/")
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { categoryId: parts[0], item: parts[1] }
  }
  if (parts.length === 3 && parts[1] === "Settings") {
    return { categoryId: parts[0], item: "Settings", settingsView: parts[2] }
  }
  return null
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return "just now"
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export const AUTHOR_MAX = 60
export const BODY_MAX = 2000
