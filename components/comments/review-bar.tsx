"use client"

import { useState } from "react"
import { parseViewKey, timeAgo } from "@/lib/comments"
import { useComments } from "./comments-provider"
import styles from "./comments.module.css"

export function ReviewBar() {
  const { all, onThisView, show, setShow, storage, loadError, jumpTo } = useComments()
  const [listOpen, setListOpen] = useState(false)

  const elsewhere = all.length - onThisView.length

  // Group by screen so a comment left on another page is still reachable.
  const groups = all.reduce<{ label: string; viewKey: string; items: typeof all }[]>((acc, comment) => {
    const existing = acc.find((g) => g.viewKey === comment.viewKey)
    if (existing) existing.items.push(comment)
    else acc.push({ label: comment.viewLabel, viewKey: comment.viewKey, items: [comment] })
    return acc
  }, [])

  return (
    <div className={styles.bar} data-comment-ui>
      <div className={styles.barInner}>
        <span className={styles.barTitle}>
          <span className={styles.barDot} aria-hidden="true" />
          Prototype review
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={show}
          className={`${styles.flip} ${show ? styles.flipOn : ""}`}
          onClick={() => setShow(!show)}
        >
          <span className={styles.flipTrack} aria-hidden="true">
            <span className={styles.flipKnob} />
          </span>
          {show ? "Comments on" : "Comments off"}
        </button>

        <span className={styles.barCount}>
          {all.length === 0
            ? "No comments yet"
            : `${onThisView.length} on this screen${elsewhere > 0 ? ` · ${elsewhere} elsewhere` : ""}`}
        </span>

        {show && (
          <span className={styles.barNote}>
            {all.length === 0
              ? "Click any empty space to leave a comment."
              : "Click empty space to add · click a pin to edit."}
          </span>
        )}

        <span className={styles.barSpacer} />

        {loadError && <span className={styles.barNote}>Comments could not load.</span>}

        <button type="button" className={styles.barBtn} onClick={() => setListOpen((v) => !v)}>
          {listOpen ? "Hide list" : `All comments${all.length > 0 ? ` (${all.length})` : ""}`}
        </button>
      </div>

      {listOpen && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>All comments</h2>
            <button type="button" className={styles.ghostBtn} onClick={() => setListOpen(false)}>
              Close
            </button>
          </div>

          {all.length === 0 ? (
            <p className={styles.panelEmpty}>
              Nothing yet. Turn comments on, then click any empty area of the page.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.viewKey} className={styles.panelGroup}>
                <h3 className={styles.panelGroupTitle}>{group.label}</h3>
                {group.items.map((comment, i) => (
                  <button
                    key={comment.id}
                    type="button"
                    className={styles.panelItem}
                    onClick={() => {
                      const target = parseViewKey(comment.viewKey)
                      if (target && jumpTo) {
                        setShow(true)
                        jumpTo(target)
                        setListOpen(false)
                      }
                    }}
                  >
                    <span className={styles.panelItemHead}>
                      <span className={styles.panelIndex}>{i + 1}</span>
                      <span className={styles.panelAuthor}>{comment.author}</span>
                      <span className={styles.panelTime}>
                        {timeAgo(comment.createdAt)}
                        {comment.updatedAt ? " · edited" : ""}
                      </span>
                    </span>
                    <span className={styles.panelBody}>{comment.body}</span>
                  </button>
                ))}
              </div>
            ))
          )}

          {storage && (
            <p className={styles.panelFoot}>
              {storage.durable
                ? "Saved on the server — everyone opening this prototype sees the same comments."
                : "Saved on the server, but this deployment uses temporary storage: comments can be cleared when it restarts."}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
