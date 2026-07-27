// Tablecloth service layer - every call this site makes to the platform
// goes through here. Reusing this file for the next cart is meant to be a
// config change only (VITE_TABLECLOTH_API_URL + VITE_SITE_ID), not a rewrite.
//
// @typedef {Object} MenuAddon
// @property {string} id
// @property {string} name
// @property {string|null} price_text
// @property {number} price_cents
//
// @typedef {Object} MenuItem
// @property {string} id
// @property {string} name
// @property {string} category
// @property {string|null} description
// @property {string|null} price_text
// @property {number} price_cents
// @property {string|null} image_url
// @property {boolean} sold_out
// @property {MenuAddon[]} addons
//
// @typedef {Object} HoursStatus
// @property {boolean} isOpen
// @property {string} message
//
// @typedef {Object} OrderLine
// @property {string} itemId
// @property {number} quantity
// @property {string[]} [addonIds]
//
// @typedef {Object} OrderResult
// @property {string} id
// @property {string} order_number
// @property {number} total_cents
// @property {string} status

const API_URL = import.meta.env.VITE_TABLECLOTH_API_URL;
const SITE_ID = import.meta.env.VITE_SITE_ID;

export const isConfigured = !!(API_URL && SITE_ID);

async function request(path, options = {}) {
  if (!isConfigured) {
    throw new Error("Tablecloth isn't configured for this site (missing VITE_TABLECLOTH_API_URL / VITE_SITE_ID).");
  }
  const res = await fetch(`${API_URL}/api/public/food/${SITE_ID}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch { /* no JSON body */ }
    throw new Error(message);
  }
  return res.json();
}

/** @returns {Promise<MenuItem[]>} */
export function getMenu() {
  return request("/menu");
}

/** @returns {Promise<HoursStatus>} */
export function getHoursStatus() {
  return request("/hours-status");
}

/**
 * @param {{customerName:string, customerPhone?:string, customerEmail?:string,
 *          fulfillmentMode:'pickup_pay_later'|'pickup_pay_now', items:OrderLine[], notes?:string}} order
 * @returns {Promise<OrderResult>}
 */
export function createOrder(order) {
  return request("/orders", { method: "POST", body: JSON.stringify(order) });
}

/**
 * @param {{name:string, email?:string, phone?:string, eventDate?:string, headcount?:number, message?:string}} lead
 */
export function createLead(lead) {
  return request("/leads", { method: "POST", body: JSON.stringify(lead) });
}
