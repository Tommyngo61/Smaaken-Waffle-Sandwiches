import { useState } from "react";
import { createLead } from "../tableclothClient.js";

// Lead-capture only, as specified - this creates a row Tablecloth's owner
// dashboard shows (see FoodOrdersPanel in the TableCloth-App admin), not a
// booking/quote/deposit engine. That's a later upgrade, not this form's job.
export default function Catering({ content }) {
  const [fields, setFields] = useState({ name: "", email: "", phone: "", eventDate: "", headcount: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fields.name.trim()) return setError("Name is required.");

    setSubmitting(true);
    try {
      await createLead({
        name: fields.name.trim(),
        email: fields.email.trim() || undefined,
        phone: fields.phone.trim() || undefined,
        eventDate: fields.eventDate || undefined,
        headcount: fields.headcount ? parseInt(fields.headcount, 10) : undefined,
        message: fields.message.trim() || undefined,
      });
      setSent(true);
    } catch (e2) {
      setError(e2.message || "Could not send that - please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="catering-section" id="catering">
      <div className="wrap">
        <p className="section-kicker">Catering</p>
        <h2>{content.catering?.heading || "Catering & large orders"}</h2>
        {content.catering?.blurb && <p style={{ color: "var(--muted)", maxWidth: "60ch" }}>{content.catering.blurb}</p>}

        {sent ? (
          <p className="form-success" style={{ marginTop: 20, maxWidth: 480 }}>
            Thanks! We got your request and will follow up shortly.
          </p>
        ) : (
          <form className="catering-form" onSubmit={submit}>
            <div className="row2">
              <div className="field">
                <label htmlFor="cat-name">Name</label>
                <input id="cat-name" value={fields.name} onChange={set("name")} />
              </div>
              <div className="field">
                <label htmlFor="cat-email">Email</label>
                <input id="cat-email" type="email" value={fields.email} onChange={set("email")} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="cat-phone">Phone</label>
                <input id="cat-phone" value={fields.phone} onChange={set("phone")} />
              </div>
              <div className="field">
                <label htmlFor="cat-date">Event date</label>
                <input id="cat-date" type="date" value={fields.eventDate} onChange={set("eventDate")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="cat-headcount">Headcount</label>
              <input id="cat-headcount" type="number" min="1" value={fields.headcount} onChange={set("headcount")} />
            </div>
            <div className="field">
              <label htmlFor="cat-message">Tell us about the event</label>
              <textarea id="cat-message" rows={3} value={fields.message} onChange={set("message")} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ justifySelf: "start" }}>
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
