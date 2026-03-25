"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type ContactSubmission } from "@/lib/api";

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      setLoading(true);
      try {
        const result = await api.getContacts({ limit: 100 });
        if (!active) return;
        setContacts(result.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load contacts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadContacts();
    return () => {
      active = false;
    };
  }, []);

  async function handleReadToggle(id: string, read: boolean) {
    try {
      const updated = await api.updateContact(id, !read);
      setContacts((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update contact state.");
    }
  }

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Admin</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Contacts</h2>
      </article>

      {error ? <article className="soft-panel p-4 text-sm text-rose-muted">{error}</article> : null}

      <article className="soft-panel p-5 sm:p-6">
        {loading ? <p className="text-sm text-rose-muted">Loading contacts...</p> : null}
        {!loading ? (
          <div className="grid gap-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-rose-muted">No contact submissions yet.</p>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-rose-ink">{contact.name}</p>
                      <p className="text-xs text-rose-muted">{contact.email}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => handleReadToggle(contact.id, contact.read)}
                    >
                      Mark as {contact.read ? "Unread" : "Read"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-rose-muted">{contact.message}</p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}
