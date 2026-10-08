import { NextResponse } from "next/server"
import { commentsStore } from "@/lib/server/comments-store"
import { BODY_MAX } from "@/lib/comments"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const raw = (payload as { body?: unknown })?.body
  const body = typeof raw === "string" ? raw.trim() : ""
  if (!body) return NextResponse.json({ error: "A comment is required." }, { status: 400 })

  try {
    const comment = await commentsStore.update(id, body.slice(0, BODY_MAX))
    if (!comment) return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 })
    return NextResponse.json({ comment })
  } catch (error) {
    return NextResponse.json(
      { error: "Could not save your change.", detail: String(error) },
      { status: 503 },
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const removed = await commentsStore.remove(id)
    if (!removed) return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Could not delete the comment.", detail: String(error) },
      { status: 503 },
    )
  }
}
