export default function Footer({ content }) {
  const { instagram, phone, phoneHref } = content.business || {};

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-links">
          {instagram && <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>}
          {phone && <a href={`tel:${phoneHref || phone}`}>{phone}</a>}
        </div>
        <div>{content.business?.name}</div>
        <div className="footer-powered">Powered by Tablecloth</div>
      </div>
    </footer>
  );
}
