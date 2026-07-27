// Menu is deliberately NOT sourced from content.json - it's operational data
// (price, sold-out status, add-ons) that lives in Tablecloth's ordering
// tables, imported from the CMS but re-fetched live here. There is no
// content-based fallback: if this can't load, ordering wouldn't work anyway,
// so a clear "try again" message beats a stale menu nobody can actually order.
export default function Menu({ menu, menuError, onSelectItem }) {
  if (menuError) {
    return (
      <section className="menu-section" id="menu">
        <div className="wrap">
          <p className="section-kicker">Menu</p>
          <h2>What's Cooking</h2>
          <p style={{ color: "var(--muted)" }}>
            The menu couldn't load right now. Please refresh, or call us to order.
          </p>
        </div>
      </section>
    );
  }

  if (!menu) {
    return (
      <section className="menu-section" id="menu">
        <div className="wrap"><p style={{ color: "var(--muted)" }}>Loading menu…</p></div>
      </section>
    );
  }

  const categories = [];
  const byCategory = new Map();
  for (const item of menu) {
    const cat = item.category || "Menu";
    if (!byCategory.has(cat)) { byCategory.set(cat, []); categories.push(cat); }
    byCategory.get(cat).push(item);
  }

  return (
    <section className="menu-section" id="menu">
      <div className="wrap">
        <p className="section-kicker">Menu</p>
        <h2>What's Cooking</h2>
        <div className="menu-categories">
          {categories.map((cat) => (
            <div className="menu-category" key={cat}>
              <h3>{cat}</h3>
              <div className="menu-grid">
                {byCategory.get(cat).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="menu-item-btn"
                    disabled={item.sold_out}
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="menu-item-head">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="menu-item-price">${(item.price_cents / 100).toFixed(2)}</span>
                      {item.sold_out && <span className="sold-out-tag">Sold out</span>}
                    </div>
                    {item.description && <div className="menu-item-desc">{item.description}</div>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
