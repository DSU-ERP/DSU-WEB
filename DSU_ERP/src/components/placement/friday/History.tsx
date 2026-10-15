"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Row } from "@/lib/placement/types";
import { groupConversations } from "@/lib/friday/view";

function when(raw: unknown): string {
  const at = typeof raw === "string" ? new Date(raw) : null;
  if (!at || Number.isNaN(at.getTime())) return "";
  const today = new Date();
  const sameDay = at.toDateString() === today.toDateString();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (sameDay || at.toDateString() === y.toDateString())
    return at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return at.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function History({
  open,
  onClose,
  conversations,
  activeId,
  onOpen,
  onNew,
  onDelete,
  onRename,
}: {
  open: boolean;
  onClose: () => void;
  conversations: Row[];
  activeId?: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const renameDialog = useRef<HTMLDialogElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState("");

  useEffect(() => {
    const d = renameDialog.current;
    if (!d) return;
    if (editing && !d.open) {
      d.showModal();
      renameInput.current?.select();
    }
    if (!editing && d.open) d.close();
  }, [editing]);

  async function saveName() {
    if (!editing || saving || !title.trim()) return;
    setSaving(true);
    setRenameError("");
    try {
      await onRename(String(editing.id), title.trim());
      setEditing(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "That conversation could not be renamed.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = confirm.current;
    if (!d) return;
    if (pending && !d.open) d.showModal();
    if (!pending && d.open) d.close();
  }, [pending]);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(String(pending.id));
      setPending(null);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "That conversation could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const groups = open ? groupConversations(conversations, new Date()) : [];

  return (
    <>
      <dialog
        ref={drawer}
        className="fr-drawer"
        aria-labelledby="fr-drawer-title"
        onClose={onClose}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes it.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {open && (
          <div className="fr-drawer-body">
            <header className="fr-drawer-head">
              <h2 id="fr-drawer-title">
                <span className="fr-marker" aria-hidden="true" />
                Conversations
                <span className="fr-count">{conversations.length}</span>
              </h2>
              <button
                type="button"
                className="fr-icon-btn"
                onClick={onClose}
                aria-label="Close conversations"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            <button
              type="button"
              className="fr-btn fr-btn--outline fr-btn--block"
              onClick={() => {
                onNew();
                onClose();
              }}
            >
              <Plus size={15} aria-hidden="true" />
              New conversation
            </button>

            {groups.length ? (
              groups.map((g) => (
                <section key={g.label} className="fr-drawer-group" aria-label={g.label}>
                  <h3>
                    <span>{g.label}</span>
                    <span>
                      {g.items.length} {g.items.length === 1 ? "conversation" : "conversations"}
                    </span>
                  </h3>
                  <ul>
                    {g.items.map((c) => {
                      const id = String(c.id);
                      const title = String(c.title ?? "Conversation");
                      const active = id === activeId;
                      return (
                        <li key={id} className={active ? "is-active" : undefined}>
                          <button
                            type="button"
                            className="fr-history-open"
                            aria-current={active ? "true" : undefined}
                            onClick={() => {
                              onOpen(id);
                              onClose();
                            }}
                          >
                            <span className="fr-history-title">{title}</span>
                            <span className="fr-history-time">{when(c.updated_at ?? c.created_at)}</span>
                          </button>
                          <button
                            type="button"
                            className="fr-icon-btn"
                            aria-label={`Rename conversation: ${title}`}
                            onClick={() => {
                              setTitle(title);
                              setRenameError("");
                              setEditing(c);
                            }}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="fr-icon-btn fr-history-delete"
                            aria-label={`Delete conversation: ${title}`}
                            onClick={() => {
                              setDeleteError("");
                              setPending(c);
                            }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <p className="fr-drawer-empty">
                No saved conversations yet. A conversation is saved here once
                F.R.I.D.A.Y. finishes its first reply.
              </p>
            )}
          </div>
        )}
      </dialog>

      <dialog
        ref={renameDialog}
        className="fr-confirm"
        aria-labelledby="fr-rename-title"
        onCancel={(e) => { if (saving) e.preventDefault(); }}
        onClose={() => { if (!saving) setEditing(null); }}
      >
        {editing && (
          <form className="fr-confirm-body" onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
            <h2 id="fr-rename-title">Rename conversation</h2>
            <label className="fr-rename-label" htmlFor="fr-conversation-name">Conversation name</label>
            <input
              ref={renameInput}
              id="fr-conversation-name"
              className="fr-rename-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              disabled={saving}
              autoFocus
              aria-describedby={renameError ? "fr-rename-error" : undefined}
            />
            {renameError && <p id="fr-rename-error" className="fr-error" role="alert">{renameError}</p>}
            <div className="fr-confirm-actions">
              <button type="button" className="fr-btn fr-btn--outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="fr-btn fr-btn--primary" disabled={saving || !title.trim()}>{saving ? "Saving" : "Save name"}</button>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={confirm}
        className="fr-confirm"
        role="alertdialog"
        aria-labelledby="fr-confirm-title"
        aria-describedby="fr-confirm-desc"
        onClose={() => {
          if (!deleting) setPending(null);
        }}
      >
        {pending && (
          <div className="fr-confirm-body">
            <div className="fr-confirm-head">
              <span className="fr-confirm-icon" aria-hidden="true">
                <Trash2 size={18} />
              </span>
              <div>
                <h2 id="fr-confirm-title">Delete this conversation?</h2>
                <p id="fr-confirm-desc">
                  The conversation and all of its messages are permanently
                  deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <p className="fr-confirm-item">
              <span className="fr-marker" aria-hidden="true" />
              {String(pending.title ?? "Conversation")}
              {when(pending.updated_at ?? pending.created_at) &&
                ` (${when(pending.updated_at ?? pending.created_at)})`}
            </p>
            {deleteError && (
              <p className="fr-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="fr-confirm-actions">
              <button
                type="button"
                className="fr-btn fr-btn--outline"
                autoFocus
                disabled={deleting}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fr-btn fr-btn--danger"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={15} aria-hidden="true" />
                {deleting ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
