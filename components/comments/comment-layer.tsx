"use client"

import { useEffect, useRef, useState } from "react"
import { AUTHOR_MAX, BODY_MAX, timeAgo } from "@/lib/comments"
import { useComments } from "./comments-provider"
import styles from "./comments.module.css"

// A click on any of these is the reviewer using the prototype, not commenting.
const INTERACTIVE = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "option",
  '[role="button"]',
  '[role="tab"]',
  '[role="link"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[contenteditable="true"]',
].join(",")

interface Draft {
  xPct: number
  yPx: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function CommentLayer() {
  const { onThisView, show, author, setAuthor, add, edit, remove, viewKey } = useComments()
  const layerRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  // The click listener must see current values without resubscribing on every
  // keystroke, so it reads them through refs.
  const draftRef = useRef(draft)
  draftRef.current = draft
  const openIdRef = useRef(openId)
  openIdRef.current = openId

  // Close transient UI when the layer is switched off, or the screen changes
  // underneath an open card.
  useEffect(() => {
    setDraft(null)
    setOpenId(null)
  }, [show, viewKey])

  useEffect(() => {
    if (!show) return
    const layer = layerRef.current
    const root = layer?.parentElement
    if (!layer || !root) return

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      if (!target || !root.contains(target)) return
      // Our own bar, pins and cards are not comment targets.
      if (target.closest("[data-comment-ui]")) return
      if (target.closest(INTERACTIVE)) return
      // Finishing a text selection is not a request to comment.
      if ((window.getSelection()?.toString() ?? "").trim().length > 0) return

      // An outside click dismisses whatever is open rather than moving it.
      if (draftRef.current) {
        setDraft(null)
        return
      }
      if (openIdRef.current) {
        setOpenId(null)
        return
      }

      const rect = layer.getBoundingClientRect()
      if (rect.width === 0) return
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

      setDraft({ xPct: clamp01(x / rect.width), yPx: Math.round(y) })
    }

    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [show])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (draft) setDraft(null)
      else if (openId) setOpenId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [draft, openId])

  if (!show) return <div className={styles.layer} ref={layerRef} aria-hidden="true" />

  return (
    <div className={styles.layer} ref={layerRef}>
      {onThisView.map((comment, index) => (
        <button
          key={comment.id}
          type="button"
          data-comment-ui
          className={`${styles.pin} ${openId === comment.id ? styles.pinActive : ""}`}
          style={{ left: `${comment.xPct * 100}%`, top: comment.yPx }}
          aria-label={`Comment ${index + 1} by ${comment.author}`}
          onClick={() => {
            setDraft(null)
            setOpenId((current) => (current === comment.id ? null : comment.id))
          }}
        >
          {index + 1}
        </button>
      ))}

      {onThisView.map((comment) =>
        openId === comment.id ? (
          <CommentCard
            key={`card-${comment.id}`}
            xPct={comment.xPct}
            yPx={comment.yPx}
            author={comment.author}
            createdAt={comment.createdAt}
            updatedAt={comment.updatedAt}
            body={comment.body}
            onClose={() => setOpenId(null)}
            onSave={(body) => edit(comment.id, body)}
            onDelete={() => remove(comment.id)}
          />
        ) : null,
      )}

      {draft && (
        <ComposerCard
          xPct={draft.xPct}
          yPx={draft.yPx}
          author={author}
          onAuthorChange={setAuthor}
          onCancel={() => setDraft(null)}
          onSubmit={(body, name) => add({ body, author: name, xPct: draft.xPct, yPx: draft.yPx })}
        />
      )}
    </div>
  )
}

function cardPosition(xPct: number, yPx: number) {
  const flip = xPct > 0.6
  return {
    className: flip ? `${styles.card} ${styles.cardLeft}` : styles.card,
    style: { left: `${xPct * 100}%`, top: yPx + 20 },
  }
}

function ComposerCard({
  xPct,
  yPx,
  author,
  onAuthorChange,
  onCancel,
  onSubmit,
}: {
  xPct: number
  yPx: number
  author: string
  onAuthorChange: (next: string) => void
  onCancel: () => void
  onSubmit: (body: string, author: string) => Promise<string | null>
}) {
  const [body, setBody] = useState("")
  const [name, setName] = useState(author)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const { className, style } = cardPosition(xPct, yPx)

  useEffect(() => {
    bodyRef.current?.focus({ preventScroll: true })
  }, [])

  const ready = body.trim().length > 0 && name.trim().length > 0

  const submit = async () => {
    if (!ready || saving) return
    setSaving(true)
    setError(null)
    const trimmedName = name.trim()
    const problem = await onSubmit(body.trim(), trimmedName)
    setSaving(false)
    if (problem) {
      setError(problem)
      return
    }
    if (trimmedName !== author) onAuthorChange(trimmedName)
    onCancel()
  }

  return (
    <div className={className} style={style} data-comment-ui role="dialog" aria-label="Leave a comment">
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="review-author">
          Your name
        </label>
        <input
          id="review-author"
          className={styles.input}
          value={name}
          maxLength={AUTHOR_MAX}
          placeholder="e.g. Priya"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="review-body">
          Comment
        </label>
        <textarea
          id="review-body"
          ref={bodyRef}
          className={styles.textarea}
          value={body}
          maxLength={BODY_MAX}
          placeholder="What should change here?"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.primaryBtn} disabled={!ready || saving} onClick={() => void submit()}>
          {saving ? "Saving…" : "Comment"}
        </button>
        <button type="button" className={styles.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  )
}

function CommentCard({
  xPct,
  yPx,
  author,
  createdAt,
  updatedAt,
  body,
  onClose,
  onSave,
  onDelete,
}: {
  xPct: number
  yPx: number
  author: string
  createdAt: string
  updatedAt?: string
  body: string
  onClose: () => void
  onSave: (body: string) => Promise<string | null>
  onDelete: () => Promise<string | null>
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view")
  const [text, setText] = useState(body)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { className, style } = cardPosition(xPct, yPx)

  const save = async () => {
    const next = text.trim()
    if (!next || busy) return
    setBusy(true)
    setError(null)
    const problem = await onSave(next)
    setBusy(false)
    if (problem) {
      setError(problem)
      return
    }
    setMode("view")
  }

  const destroy = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    const problem = await onDelete()
    setBusy(false)
    if (problem) {
      setError(problem)
      return
    }
    onClose()
  }

  return (
    <div className={className} style={style} data-comment-ui role="dialog" aria-label={`Comment by ${author}`}>
      <div className={styles.cardHead}>
        <span className={styles.cardAuthor}>{author}</span>
        <span className={styles.cardMeta}>
          {timeAgo(createdAt)}
          {updatedAt ? " · edited" : ""}
        </span>
      </div>

      {mode === "edit" ? (
        <>
          <textarea
            className={styles.textarea}
            value={text}
            maxLength={BODY_MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void save()
              }
            }}
          />
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={text.trim().length === 0 || busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => {
                setText(body)
                setError(null)
                setMode("view")
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : mode === "confirm-delete" ? (
        <>
          <p className={styles.cardBody}>Delete this comment? This cannot be undone.</p>
          <div className={styles.cardActions}>
            <button type="button" className={styles.dangerBtn} disabled={busy} onClick={() => void destroy()}>
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setMode("view")}>
              Keep
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.cardBody}>{body}</p>
          <div className={styles.cardActions}>
            <button type="button" className={styles.ghostBtn} onClick={() => setMode("edit")}>
              Edit
            </button>
            <button type="button" className={styles.dangerBtn} onClick={() => setMode("confirm-delete")}>
              Delete
            </button>
            <button type="button" className={styles.ghostBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  )
}
