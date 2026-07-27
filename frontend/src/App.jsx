import { useEffect, useState } from "react";
import fallbackContent from "./content.json";
import * as tablecloth from "./tableclothClient.js";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Menu from "./components/Menu.jsx";
import HoursLocation from "./components/HoursLocation.jsx";
import Catering from "./components/Catering.jsx";
import Footer from "./components/Footer.jsx";
import OrderModal from "./components/OrderModal.jsx";

// TEMPLATE: food-menu (single-page food cart / restaurant site)
//
// Marketing copy (business details, hero, hours table, catering blurb)
// comes from Tablecloth's public content API at runtime, with content.json
// as an offline-dev / Tablecloth-outage fallback - same pattern as every
// other Tablecloth client site.
//
// The menu and the live open/closed status are DIFFERENT: they're real
// operational state (sold-out flips minute to minute), not marketing copy,
// so they always come live from tableclothClient.js and have no fallback -
// see that file's comment and Menu.jsx's for why.
const API_URL = import.meta.env.VITE_TABLECLOTH_API_URL;
const SITE_ID = import.meta.env.VITE_SITE_ID;

function useContent() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (!API_URL || !SITE_ID) {
      setContent(fallbackContent);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/public/sites/${SITE_ID}/content`)
      .then((res) => {
        if (!res.ok) throw new Error(`Content API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch((err) => {
        console.error("Could not load live content, falling back to bundled content.json:", err);
        if (!cancelled) setContent(fallbackContent);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return content;
}

export default function App() {
  const content = useContent();
  const [menu, setMenu] = useState(null);
  const [menuError, setMenuError] = useState(false);
  const [hoursStatus, setHoursStatus] = useState(null);
  const [orderItem, setOrderItem] = useState(null);

  useEffect(() => {
    tablecloth.getMenu().then(setMenu).catch(() => setMenuError(true));
    tablecloth.getHoursStatus().then(setHoursStatus).catch(() => {});
  }, []);

  if (!content) return null;

  return (
    <>
      <Header content={content} />
      <Hero content={content} hoursStatus={hoursStatus} />
      <Menu menu={menu} menuError={menuError} onSelectItem={setOrderItem} />
      <HoursLocation content={content} />
      <Catering content={content} />
      <Footer content={content} />
      {orderItem && (
        <OrderModal item={orderItem} orderingConfig={content.ordering} onClose={() => setOrderItem(null)} />
      )}
    </>
  );
}
