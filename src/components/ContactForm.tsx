"use client";

import { FormEvent, useState } from "react";

type SubmitState = "idle" | "submitting" | "sent" | "error";

export default function ContactForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitState("submitting");

    try {
      const response = await fetch("https://formspree.io/f/xdawqqov", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Form submit failed");
      }

      form.reset();
      setSubmitState("sent");
    } catch {
      setSubmitState("error");
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
        <span className="text-rose-muted">Occasion</span>
        <input
          type="text"
          name="occasion"
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
          <p className="text-sm text-rose-muted">Could not send. Please try again.</p>
        )}
      </div>
    </form>
  );
}
