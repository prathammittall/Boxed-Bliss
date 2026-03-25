"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";

type SubmitState = "idle" | "submitting" | "sent" | "error";

export default function ContactForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setSubmitState("error");
      setErrorMessage("Name, email, and message are required.");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      await api.createContact({
        name,
        email,
        phone: phone || undefined,
        subject: subject || undefined,
        message,
      });

      form.reset();
      setSubmitState("sent");
    } catch (error) {
      const messageFromApi =
        error instanceof ApiError ? error.message : "Could not send your request. Please try again.";
      setSubmitState("error");
      setErrorMessage(messageFromApi);
    }
  }

  return (
    <form className="soft-panel p-5 sm:p-7" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-rose-muted">Your name</span>
          <input
            type="text"
            name="name"
            required
            className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-rose-muted">Email</span>
          <input
            type="email"
            name="email"
            required
            className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
          />
        </label>
      </div>

      <label className="block mt-4 text-sm">
        <span className="text-rose-muted">Subject</span>
        <input
          type="text"
          name="subject"
          className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
        />
      </label>

      <label className="block mt-4 text-sm">
        <span className="text-rose-muted">Phone (optional)</span>
        <input
          type="tel"
          name="phone"
          className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
        />
      </label>

      <label className="block mt-4 text-sm">
        <span className="text-rose-muted">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={submitState === "submitting"}>
          Submit request
        </button>
        <button type="reset" className="btn-ghost" disabled={submitState === "submitting"}>
          Clear
        </button>
        {submitState === "sent" && <p className="text-sm text-rose-ink">Sent</p>}
        {submitState === "error" && (
          <p className="text-sm text-rose-muted">{errorMessage || "Could not send. Please try again."}</p>
        )}
      </div>
    </form>
  );
}
