"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import type { CommentsPayload, ReviewComment, StorageInfo, ViewTarget } from "@/lib/comments"

const AUTHOR_KEY = "sc-review-author"
const SHOW_KEY = "sc-review-show"

interface CommentsContextValue {
  /** Every comment in the prototype, oldest first. */
  all: ReviewComment[]
  /** Comments anchored to the screen currently on show. */
  onThisView: ReviewComment[]
  show: boolean
  setShow: (next: boolean) => void
  storage?: StorageInfo
  loadError: boolean
  author: string
  setAuthor: (next: string) => void
  viewKey: string
  viewLabel: string
  add: (input: { body: string; author: string; xPct: number; yPx: number }) => Promise<string | null>
  edit: (id: string, body: string) => Promise<string | null>
  remove: (id: string) => Promise<string | null>
  jumpTo?: (target: ViewTarget) => void
}

const CommentsContext = createContext<CommentsContextValue | null>(null)

export function useComments(): CommentsContextValue {
  const ctx = useContext(CommentsContext)
  if (!ctx) throw new Error("useComments must be used inside CommentsProvider")
  return ctx
}

const fetcher = async (url: string): Promise<CommentsPayload> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

/** Reads {error} out of a failed response so the UI can show the real reason. */
async function problemFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return typeof data?.error === "string" ? data.error : fallback
  } catch {
    return fallback
  }
}

export function CommentsProvider({
  viewKey,
  viewLabel,
  jumpTo,
  children,
}: {
  viewKey: string
  viewLabel: string
  jumpTo?: (target: ViewTarget) => void
  children: React.ReactNode
}) {
  const { data, error, mutate } = useSWR<CommentsPayload>("/api/comments", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })

  // Name and visibility are per-person preferences, so they stay in the
  // browser. The comments themselves are always server-side.
  const [author, setAuthorState] = useState("")
  const [show, setShowState] = useState(true)

  useEffect(() => {
    try {
      const storedAuthor = window.localStorage.getItem(AUTHOR_KEY)
      if (storedAuthor) setAuthorState(storedAuthor)
      const storedShow = window.localStorage.getItem(SHOW_KEY)
      if (storedShow !== null) setShowState(storedShow === "1")
    } catch {
      // Private browsing can throw on access; defaults are fine.
    }
  }, [])

  const setAuthor = useCallback((next: string) => {
    setAuthorState(next)
    try {
      window.localStorage.setItem(AUTHOR_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const setShow = useCallback((next: boolean) => {
    setShowState(next)
    try {
      window.localStorage.setItem(SHOW_KEY, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [])

  const all = useMemo(() => {
    const list = data?.comments ?? []
    return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [data])

  const onThisView = useMemo(() => all.filter((c) => c.viewKey === viewKey), [all, viewKey])

  const add = useCallback<CommentsContextValue["add"]>(
    async (input) => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, viewKey, viewLabel }),
        })
        if (!res.ok) return problemFrom(res, "Could not save the comment.")
        await mutate()
        return null
      } catch {
        return "Could not reach the server."
      }
    },
    [mutate, viewKey, viewLabel],
  )

  const edit = useCallback<CommentsContextValue["edit"]>(
    async (id, body) => {
      try {
        const res = await fetch(`/api/comments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        })
        if (!res.ok) return problemFrom(res, "Could not save your change.")
        await mutate()
        return null
      } catch {
        return "Could not reach the server."
      }
    },
    [mutate],
  )

  const remove = useCallback<CommentsContextValue["remove"]>(
    async (id) => {
      try {
        const res = await fetch(`/api/comments/${id}`, { method: "DELETE" })
        if (!res.ok) return problemFrom(res, "Could not delete the comment.")
        await mutate()
        return null
      } catch {
        return "Could not reach the server."
      }
    },
    [mutate],
  )

  const value = useMemo<CommentsContextValue>(
    () => ({
      all,
      onThisView,
      show,
      setShow,
      storage: data?.storage,
      loadError: Boolean(error),
      author,
      setAuthor,
      viewKey,
      viewLabel,
      add,
      edit,
      remove,
      jumpTo,
    }),
    [all, onThisView, show, setShow, data, error, author, setAuthor, viewKey, viewLabel, add, edit, remove, jumpTo],
  )

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}
