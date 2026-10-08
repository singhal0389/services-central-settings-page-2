import { NextResponse } from "next/server"
import { commentsStore } from "@/lib/server/comments-store"
import { AUTHOR_MAX, BODY_MAX, type NewComment } from "@/lib/comments"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const comments = await commentsStore.list()
    return NextResponse.json({ comments, storage: commentsStore.info })
  } catch (error) {
    return NextResponse.json(
      { error: "Could not read comments.", detail: String(error) },
      { status: 503 },
    )
  }
}

function parseBody(raw: unknown): { value?: NewComment; problem?: string } {
  if (!raw || typeof raw !== "object") return { problem: "Expected a JSON object." }
  const b = raw as Record<string, unknown>

  const author = typeof b.author === "string" ? b.author.trim() : ""
  const body = typeof b.body === "string" ? b.body.trim() : ""
  const viewKey = typeof b.viewKey === "string" ? b.viewKey.trim() : ""
  const viewLabel = typeof b.viewLabel === "string" ? b.viewLabel.trim() : ""
  const xPct = Number(b.xPct)
  const yPx = Number(b.yPx)

  if (!author) return { problem: "A name is required." }
  if (!body) return { problem: "A comment is required." }
  if (!viewKey) return { problem: "A viewKey is required." }
  if (!Number.isFinite(xPct) || xPct < 0 || xPct > 1) return { problem: "xPct must be between 0 and 1." }
  if (!Number.isFinite(yPx) || yPx < 0) return { problem: "yPx must be a positive number." }

  return {
    value: {
      author: author.slice(0, AUTHOR_MAX),
      body: body.slice(0, BODY_MAX),
      viewKey,
      viewLabel: viewLabel || viewKey,
      xPct,
      yPx,
    },
  }
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { value, problem } = parseBody(payload)
  if (!value) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const comment = await commentsStore.create(value)
    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Could not save the comment.", detail: String(error) },
      { status: 503 },
    )
  }
}
