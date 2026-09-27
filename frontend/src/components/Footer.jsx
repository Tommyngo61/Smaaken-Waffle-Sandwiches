export default function Footer({ content }) {
  const { name, instagram, phone, phoneHref, address, mapQuery } = content.business || {};
  const query = mapQuery || address;

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-links">
          {instagram && <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>}
          {phone && <a href={`tel:${phoneHref || phone}`}>{phone}</a>}
        </div>
        <div>{name}</div>
        {/* A cart moves. Someone who has read to the bottom is deciding whether
            to walk over, and making them scroll back up to find out where it is
            is the one thing this footer should never do. It is also the oldest
            local-SEO signal there is, and it agrees with the JSON-LD seo.js
            emits. */}
        {address && (
          <div className="footer-address">
            {query ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noreferrer"
              >
                {address}
              </a>
            ) : (
              address
            )}
          </div>
        )}
        <div className="footer-powered">Powered by Tablecloth</div>
      </div>
    </footer>
  );
}
