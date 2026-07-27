// "08:00" -> "8:00 AM" - the CMS stores 24-hour clock times (an <input
// type="time"> gives no other option), but a customer reads a menu board in
// 12-hour time.
function to12Hour(hhmm) {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Displayed hours are content.hours (the weekly table an owner edits in the
// CMS). The live "open now" badge in the hero is a separate, real-time
// computation from Tablecloth - see Hero.jsx - so this table can never be
// the thing that's wrong about whether the cart is open right this second.
export default function HoursLocation({ content }) {
  const hours = content.hours || [];
  const address = content.business?.address;
  const mapQuery = content.business?.mapQuery || address;
  const mapSrc = mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : null;

  return (
    <section className="hours-section" id="hours">
      <div className="wrap hours-grid">
        <div>
          <p className="section-kicker">Hours & Location</p>
          <h2>Find the Cart</h2>
          <table className="hours-table">
            <tbody>
              {hours.map((h) => (
                <tr key={h.day} className={h.closed ? "closed" : ""}>
                  <td>{h.day}</td>
                  <td>{h.closed ? "Closed" : `${to12Hour(h.open)} – ${to12Hour(h.close)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {address && (
            <div className="address-line">
              <span aria-hidden="true">📍</span>
              <span>{address}</span>
            </div>
          )}
        </div>
        {mapSrc && (
          <iframe
            className="map-embed"
            title="Cart location map"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </section>
  );
}
