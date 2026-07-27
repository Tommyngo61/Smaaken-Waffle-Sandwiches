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
                  <td>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</td>
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
