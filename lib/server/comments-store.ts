import fs from "node:fs/promises"
import path from "node:path"
import type { NewComment, ReviewComment, StorageInfo } from "@/lib/comments"

// Comments live on the server so a reviewer's notes are visible to everyone who
// opens the prototype -- a browser-local store could never do that.
//
// Backend is a JSON file. Swap point for a real database: keep this module's
// exported interface and replace readAll/writeAll with queries.

const ON_VERCEL = process.env.VERCEL === "1"
// Vercel's deployment filesystem is read-only apart from /tmp.
const DIR = ON_VERCEL ? "/tmp/services-central-review" : path.join(process.cwd(), ".data")
const FILE = path.join(DIR, "comments.json")

const INFO: StorageInfo = { kind: "file", durable: !ON_VERCEL }

function isComment(value: unknown): value is ReviewComment {
  if (!value || typeof value !== "object") return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === "string" &&
    typeof c.author === "string" &&
    typeof c.body === "string" &&
    typeof c.viewKey === "string" &&
    typeof c.createdAt === "string" &&
    Number.isFinite(c.xPct) &&
    Number.isFinite(c.yPx)
  )
}

async function readAll(): Promise<ReviewComment[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed: unknown = JSON.parse(raw)
    const list = (parsed as { comments?: unknown })?.comments
    if (!Array.isArray(list)) return []
    // Anything written by an older build must degrade, not crash the endpoint
    // that the whole review layer depends on.
    return list.filter(isComment).map((c) => ({ ...c, viewLabel: c.viewLabel || c.viewKey }))
  } catch {
    return []
  }
}

async function writeAll(comments: ReviewComment[]): Promise<void> {
  await fs.mkdir(DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify({ comments }, null, 2), "utf8")
}

// Serialise writes so two reviewers saving at once cannot lose an entry.
let tail: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function newId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const commentsStore = {
  info: INFO,

  list(): Promise<ReviewComment[]> {
    return readAll()
  },

  create(input: NewComment): Promise<ReviewComment> {
    return serial(async () => {
      const comments = await readAll()
      const comment: ReviewComment = { ...input, id: newId(), createdAt: new Date().toISOString() }
      comments.push(comment)
      await writeAll(comments)
      return comment
    })
  },

  update(id: string, body: string): Promise<ReviewComment | null> {
    return serial(async () => {
      const comments = await readAll()
      const found = comments.find((c) => c.id === id)
      if (!found) return null
      found.body = body
      found.updatedAt = new Date().toISOString()
      await writeAll(comments)
      return found
    })
  },

  remove(id: string): Promise<boolean> {
    return serial(async () => {
      const comments = await readAll()
      const next = comments.filter((c) => c.id !== id)
      if (next.length === comments.length) return false
      await writeAll(next)
      return true
    })
  },
}
