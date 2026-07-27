import { useState } from "react";
import { createOrder } from "../tableclothClient.js";

// All money math lives in this one function - every displayed number is
// this same computation, rounded to two decimals, so the on-screen total can
// never drift from what's actually submitted.
function computeTotalCents(item, selectedAddons, quantity) {
  const addonCents = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);
  return (item.price_cents + addonCents) * quantity;
}
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

// orderingConfig comes from the CMS's Ordering block (content.ordering).
// "Pay online" only ever renders enabled once a real payment provider is
// connected - the backend independently rejects pickup_pay_now regardless
// (see routes/publicFood.js), this is just so the UI doesn't offer a button
// that would only fail.
export default function OrderModal({ item, orderingConfig, onClose }) {
  const [selectedAddonIds, setSelectedAddonIds] = useState(new Set());
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentMode, setFulfillmentMode] = useState("pickup_pay_later");
  const [fields, setFields] = useState({ customerName: "", customerPhone: "", customerEmail: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const selectedAddons = item.addons.filter((a) => selectedAddonIds.has(a.id));
  const totalCents = computeTotalCents(item, selectedAddons, quantity);

  const toggleAddon = (id) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const payOnlineAvailable = !!orderingConfig?.payOnline;

  const submit = async () => {
    setError("");
    if (!fields.customerName.trim()) return setError("Your name is required.");

    setSubmitting(true);
    try {
      const result = await createOrder({
        customerName: fields.customerName.trim(),
        customerPhone: fields.customerPhone.trim() || undefined,
        customerEmail: fields.customerEmail.trim() || undefined,
        fulfillmentMode,
        items: [{ itemId: item.id, quantity, addonIds: [...selectedAddonIds] }],
      });
      setConfirmation(result);
    } catch (e) {
      setError(e.message || "Could not place the order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.name}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {confirmation ? (
          <div className="order-confirmation">
            <p className="section-kicker">Order placed</p>
            <div className="num">#{confirmation.order_number}</div>
            <p style={{ fontWeight: 600 }}>{money(confirmation.total_cents)} · Pay at pickup</p>
            <p style={{ color: "var(--muted)" }}>We'll have it ready shortly - show your order number at the window.</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h3 className="order-item-title">{item.name}</h3>
            {item.description && <p className="order-item-desc">{item.description}</p>}

            {item.addons.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Add extras</div>
                {item.addons.map((a) => (
                  <label className="addon-row" key={a.id}>
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.has(a.id)}
                      onChange={() => toggleAddon(a.id)}
                    />
                    <span className="addon-name">{a.name}</span>
                    <span className="addon-price">+{money(a.price_cents)}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="qty-row">
              <span style={{ fontWeight: 700 }}>Quantity</span>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="order-total-row">
              <span>Total</span>
              <span className="amount">{money(totalCents)}</span>
            </div>

            <div className="fulfillment-choice">
              <label className={`fulfillment-option${orderingConfig?.payAtPickup === false ? " disabled" : ""}`}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillmentMode === "pickup_pay_later"}
                  onChange={() => setFulfillmentMode("pickup_pay_later")}
                />
                Order ahead, pay at pickup
              </label>
              <label className={`fulfillment-option${!payOnlineAvailable ? " disabled" : ""}`} title={!payOnlineAvailable ? "Online payment isn't set up yet" : undefined}>
                <input
                  type="radio"
                  name="fulfillment"
                  disabled={!payOnlineAvailable}
                  checked={fulfillmentMode === "pickup_pay_now"}
                  onChange={() => setFulfillmentMode("pickup_pay_now")}
                />
                Pay online now {!payOnlineAvailable && "(coming soon)"}
              </label>
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="om-name">Name</label>
              <input id="om-name" value={fields.customerName} onChange={(e) => setFields((f) => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="om-phone">Phone (for pickup updates)</label>
              <input id="om-phone" value={fields.customerPhone} onChange={(e) => setFields((f) => ({ ...f, customerPhone: e.target.value }))} />
            </div>

            {error && <p className="form-error" style={{ marginBottom: 10 }}>{error}</p>}

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={submit} disabled={submitting}>
              {submitting ? "Placing order…" : `Place order · ${money(totalCents)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
