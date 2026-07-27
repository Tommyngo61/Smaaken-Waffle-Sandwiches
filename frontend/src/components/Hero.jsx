// The open/closed badge is the single most important trust signal on a food
// cart page - it's computed by Tablecloth from the cart's real hours (see
// tableclothClient.getHoursStatus), never hardcoded here. `null` while it
// loads renders nothing rather than a wrong guess.
export default function Hero({ content, hoursStatus }) {
  const name = content.business?.name || content.hero?.headline;
  const tagline = content.hero?.sub;

  return (
    <section className="hero" id="top">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="wrap hero-inner">
        {hoursStatus && (
          <div className={`status-badge ${hoursStatus.isOpen ? "open" : "closed"}`}>
            <span className="status-dot" aria-hidden="true" />
            {hoursStatus.message}
          </div>
        )}
        <h1>{name}</h1>
        {tagline && <p className="hero-tagline">{tagline}</p>}
        <a className="btn btn-primary" href="#menu">Order Now</a>
      </div>
    </section>
  );
}
