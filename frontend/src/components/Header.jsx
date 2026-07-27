import { useState } from "react";

// Sticky nav with in-page anchors. The Order button doesn't open a specific
// item - it just scrolls to the menu, where every dish is itself the "add to
// order" control (see Menu.jsx).
export default function Header({ content }) {
  const [open, setOpen] = useState(false);
  const name = content.business?.name || content.hero?.headline || "Menu";

  const NavLinks = ({ onClick }) => (
    <>
      <a href="#menu" onClick={onClick}>Menu</a>
      <a href="#hours" onClick={onClick}>Hours & Location</a>
      <a href="#catering" onClick={onClick}>Catering</a>
    </>
  );

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" href="#top">{name}</a>
        <nav className="nav-links" style={{ marginLeft: "auto" }}>
          <NavLinks />
        </nav>
        <a className="btn btn-primary" href="#menu" style={{ marginLeft: 18 }}>Order</a>
        <button
          className="nav-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          style={{ marginLeft: 10 }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      <div className={`nav-mobile-panel${open ? " open" : ""}`}>
        <NavLinks onClick={() => setOpen(false)} />
      </div>
    </header>
  );
}
