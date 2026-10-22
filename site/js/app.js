/* Susan's Bagel Bakery storefront. No framework: menu, cart, WhatsApp order link, reviews. */
(() => {
  "use strict";
  const API = (window.BAGEL_CONFIG && window.BAGEL_CONFIG.API_URL || "").replace(/\/$/, "");
  const CATS = [["bagel", "Bagels"], ["spread", "Spreads"], ["box", "Boxes"], ["drink", "Drinks"]];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kes = (n) => "KES " + Number(n).toLocaleString("en-KE");
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let data = { menu: [], settings: {}, reviews: [], rating: { count: 0, average: null } };
  let cart = store.get("bagel-cart-v1", {}); // { itemId: qty }

  /* ---------- illustrations: drawn in SVG, one per menu "art" key ---------- */
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const INK = "#3f1d09";
  function ringPoints(n, seed) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, t = 0.18 + r() * 0.72;
      pts.push([60 + Math.cos(a) * (19 + t * 28), 44 + Math.sin(a) * (13 + t * 20), r() * 180]);
    }
    return pts;
  }
  function bagelBase(extra, body = "#E39B34", top = "#F6C264") {
    return `<ellipse cx="60" cy="82" rx="46" ry="5" fill="${INK}" opacity=".18"/>
      <ellipse cx="60" cy="44" rx="54" ry="38" fill="${body}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="60" cy="40" rx="49" ry="33" fill="${top}"/>
      ${extra}
      <ellipse cx="60" cy="43" rx="17" ry="11" fill="#7a3d12" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="60" cy="46" rx="13" ry="6" fill="#4a2208"/>
      <path d="M18 34 Q26 16 52 11" fill="none" stroke="#FFEDB8" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  const seeds = (n, seed, fill = "#FFF3CF") => ringPoints(n, seed).map(([x, y, r]) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.6" ry="1.4" transform="rotate(${r.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}" stroke="${INK}" stroke-width=".6"/>`).join("");
  const dots = (n, seed, fill, r = 1.2) => ringPoints(n, seed).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}"/>`).join("");
  const ART = {
    plain: () => bagelBase(dots(7, 3, "#FFF0C4", 1)),
    sesame: () => bagelBase(seeds(26, 11)),
    everything: () => bagelBase(seeds(14, 21) + dots(14, 22, INK, 1.3) + ringPoints(6, 23).map(([x, y]) => `<rect x="${x - 2}" y="${y - 1.4}" width="4" height="2.8" rx="1" fill="#FBD58C" stroke="${INK}" stroke-width=".5"/>`).join("")),
    cinnamon: () => bagelBase(`<path d="M22 46 Q60 6 98 46 M30 52 Q60 22 90 52 M26 38 Q60 -2 94 38" fill="none" stroke="#9a5420" stroke-width="3.2" stroke-linecap="round" opacity=".75"/>` + ringPoints(7, 31).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.7" fill="#5a2a14" stroke="${INK}" stroke-width=".6"/>`).join("")),
    cheese: () => bagelBase(ringPoints(9, 41).map(([x, y]) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="4.2" fill="#FFE18A" stroke="#d6962f" stroke-width="1"/>`).join("") + dots(8, 42, "#c9801f", 1.6)),
    wholewheat: () => bagelBase(dots(16, 51, "#7a4a22", 1.1) + seeds(6, 52, "#EBC98A"), "#A8692F", "#C98E4F"),
    salt: () => bagelBase(ringPoints(22, 61).map(([x, y]) => `<rect x="${(x - 1.6).toFixed(1)}" y="${(y - 1.6).toFixed(1)}" width="3.2" height="3.2" rx=".8" fill="#FFFDF2" stroke="${INK}" stroke-width=".5"/>`).join("")),
    poppy: () => bagelBase(dots(34, 71, INK, 1.1) + dots(6, 72, "#FFF0C4", 1)),
    gingerbread: () => bagelBase(`<path d="M24 40 Q40 26 60 30 T96 38" fill="none" stroke="#FFF3CF" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 6"/>` + dots(10, 81, "#FFF3CF", 1.4), "#8A4B1E", "#A8662E"),
    chocolate: () => bagelBase(ringPoints(14, 91).map(([x, y, r]) => `<path d="M${x.toFixed(1)} ${(y - 3).toFixed(1)}l3.2 5.4h-6.4z" transform="rotate(${r.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#4a2208" stroke="${INK}" stroke-width=".6"/>`).join("")),
    tomato: () => bagelBase(ringPoints(9, 101).map(([x, y, r]) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.2" ry="2.4" transform="rotate(${r.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#C4442C" stroke="${INK}" stroke-width=".7"/>`).join("") + seeds(8, 102)),
    jalapeno: () => bagelBase(ringPoints(8, 111).map(([x, y]) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="4.2" fill="#FFE18A" stroke="#d6962f" stroke-width="1"/>`).join("") + ringPoints(7, 112).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#8DB34A" stroke="${INK}" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.1" fill="#E8F2B8"/>`).join("")),
    wwcinnamon: () => bagelBase(`<path d="M22 46 Q60 6 98 46 M30 52 Q60 22 90 52 M26 38 Q60 -2 94 38" fill="none" stroke="#6b3a14" stroke-width="3.2" stroke-linecap="round" opacity=".75"/>` + ringPoints(7, 121).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.7" fill="#4a2010" stroke="${INK}" stroke-width=".6"/>`).join(""), "#A8692F", "#C98E4F"),
    tub: () => `<ellipse cx="60" cy="82" rx="40" ry="5" fill="${INK}" opacity=".18"/>
      <path d="M22 34h76l-6 44a6 6 0 0 1-6 5H34a6 6 0 0 1-6-5L22 34Z" fill="#fff6dc" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="16" y="20" width="88" height="18" rx="7" fill="#A9591B" stroke="${INK}" stroke-width="3"/>
      <rect x="34" y="48" width="52" height="22" rx="8" fill="#F9BC53" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="60" cy="59" r="6" fill="#fff6dc" stroke="${INK}" stroke-width="2"/>`,
    box: () => `<ellipse cx="60" cy="84" rx="50" ry="5" fill="${INK}" opacity=".18"/>
      <ellipse cx="38" cy="30" rx="20" ry="13" fill="#F6C264" stroke="${INK}" stroke-width="3"/><ellipse cx="38" cy="30" rx="7" ry="4" fill="#7a3d12"/>
      <ellipse cx="80" cy="28" rx="20" ry="13" fill="#E39B34" stroke="${INK}" stroke-width="3"/><ellipse cx="80" cy="28" rx="7" ry="4" fill="#7a3d12"/>
      <rect x="12" y="38" width="96" height="44" rx="6" fill="#c98a45" stroke="${INK}" stroke-width="3"/>
      <rect x="8" y="34" width="104" height="14" rx="5" fill="#dfa35e" stroke="${INK}" stroke-width="3"/>
      <rect x="53" y="34" width="14" height="48" fill="#fff6dc" stroke="${INK}" stroke-width="2.4"/>`,
    drink: () => `<ellipse cx="60" cy="84" rx="30" ry="5" fill="${INK}" opacity=".18"/>
      <path d="M34 22h52l-6 58H40L34 22Z" fill="#fff6dc" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M37 38h46l-3 40H40Z" fill="#8a4a1a"/><rect x="30" y="14" width="60" height="10" rx="5" fill="#A9591B" stroke="${INK}" stroke-width="3"/>`,
  };
  const art = (key) => `<svg viewBox="0 0 120 90" role="presentation" focusable="false">${(ART[key] || ART.plain)()}</svg>`;

  /* ---------- cart helpers ---------- */
  const byId = (id) => data.menu.find((m) => String(m.id) === String(id));
  const lines = () => Object.entries(cart).map(([id, q]) => ({ item: byId(id), qty: q })).filter((l) => l.item && l.item.available && l.qty > 0);
  const totals = () => lines().reduce((a, l) => ({ n: a.n + l.qty, sum: a.sum + l.qty * l.item.price_kes }), { n: 0, sum: 0 });
  function setQty(id, q) {
    q = Math.max(0, Math.min(99, q));
    if (q) cart[id] = q; else delete cart[id];
    store.set("bagel-cart-v1", cart);
  }

  /* ---------- menu rendering ---------- */
  const ctlHTML = (m) => {
    if (!m.available) return `<span class="sold-tag">Sold out today</span>`;
    const q = cart[m.id] || 0;
    const solo = `<a class="row-solo" href="${soloLink(m)}" target="_blank" rel="noopener" aria-label="Order just ${esc(m.name)} on WhatsApp">Order just this</a>`;
    return solo + (q
      ? `<div class="stepper" role="group" aria-label="${esc(m.name)} quantity"><button type="button" data-act="dec" aria-label="One less ${esc(m.name)}">&minus;</button><output aria-live="polite">${q}</output><button type="button" data-act="inc" aria-label="One more ${esc(m.name)}">+</button></div>`
      : `<button class="add-btn" type="button" data-act="add" aria-label="Add ${esc(m.name)} to your order">Add</button>`);
  };
  function renderMenu() {
    const host = $("#menu-list");
    if (!data.menu.length) return;
    host.innerHTML = CATS.map(([cat, title]) => {
      const items = data.menu.filter((m) => m.category === cat);
      if (!items.length) return "";
      return `<h3 class="menu-cat">${title}</h3>` + items.map((m) => `
        <div class="row${m.available ? "" : " sold"}" data-id="${m.id}">
          <div class="art" aria-hidden="true">${art(m.art)}</div>
          <div class="row-main">
            <h4><span class="name">${esc(m.name)}</span><span class="lead" aria-hidden="true"></span><span class="price">${kes(m.price_kes)}</span></h4>
            <p>${esc(m.description)}</p>
          </div>
          <div class="row-ctl">${ctlHTML(m)}</div>
        </div>`).join("");
    }).join("");
    observe($$(".row", host));
  }
  function refreshRow(id, focusAct) {
    const m = byId(id), row = $(`.row[data-id="${id}"]`);
    if (!m || !row) return;
    $(".row-ctl", row).innerHTML = ctlHTML(m);
    const target = $(`[data-act="${focusAct}"]`, row) || $(`[data-act="add"]`, row);
    if (target) target.focus({ preventScroll: true });
  }

  $("#menu-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest(".row").dataset.id, q = cart[id] || 0;
    const act = b.dataset.act;
    setQty(id, act === "dec" ? q - 1 : q + 1);
    if (act === "add" && !reduceMotion) { const a = $(`.row[data-id="${id}"] .art`); a.classList.add("wobble"); setTimeout(() => a.classList.remove("wobble"), 500); }
    refreshRow(id, act === "dec" && !cart[id] ? "add" : act === "add" ? "inc" : act);
    updateCartUI(act !== "dec");
  });

  /* ---------- cart UI ---------- */
  function updateCartUI(bump) {
    const { n, sum } = totals();
    $("#cart-count").textContent = n;
    $("#bar-count").textContent = n === 1 ? "1 item" : `${n} items`;
    $("#bar-total").textContent = n ? kes(sum) : "";
    $("#cart-bar").hidden = n === 0 || dlg.open;
    if (bump && !reduceMotion) { const p = $("#cart-pill"); p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump"); }
    if (dlg.open) renderOrder();
  }

  /* ---------- order dialog ---------- */
  const dlg = $("#order"), form = $("#order-form");
  const two = (n) => String(n).padStart(2, "0");
  const localISO = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  function openOrder() {
    if (!totals().n) { document.getElementById("menu").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); return; }
    const d = $("#o-date"); const today = new Date(); const tomorrow = new Date(Date.now() + 864e5);
    d.min = localISO(today); if (!d.value) d.value = localISO(tomorrow);
    if (!$("#o-time").value) $("#o-time").value = "09:00";
    const saved = store.get("bagel-customer-v1", {});
    if (saved.name && !$("#o-name").value) $("#o-name").value = saved.name;
    if (saved.address && !$("#o-addr").value) $("#o-addr").value = saved.address;
    if (saved.phone && !$("#o-phone").value) $("#o-phone").value = saved.phone;
    if (saved.method) { const r = $(`input[name=method][value="${saved.method}"]`); if (r) r.checked = true; }
    syncMethod(); $("#order-body").hidden = false; $("#order-done").hidden = true; $("#order-msg").textContent = "";
    $("#demo-warn").hidden = !isPlaceholderNumber();
    renderOrder(); dlg.showModal(); $("#cart-bar").hidden = true;
  }
  function renderOrder() {
    const L = lines(), { sum } = totals();
    if (!L.length) { dlg.close(); return; }
    $("#order-lines").innerHTML = L.map(({ item, qty }) => `
      <li data-id="${item.id}"><span class="nm">${esc(item.name)}</span>
        <div class="stepper"><button type="button" data-act="dec" aria-label="One less ${esc(item.name)}">&minus;</button><output>${qty}</output><button type="button" data-act="inc" aria-label="One more ${esc(item.name)}">+</button></div>
        <span class="ln">${qty} &times; ${kes(item.price_kes)} = ${kes(qty * item.price_kes)}</span></li>`).join("");
    $("#order-total").textContent = kes(sum);
    const min = Number(data.settings.min_order_kes || 0), w = $("#min-warn");
    w.hidden = !(min && sum < min); if (!w.hidden) w.textContent = `Minimum order is ${kes(min)}. Add ${kes(min - sum)} more.`;
  }
  $("#order-lines").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = b.closest("li").dataset.id, q = cart[id] || 0;
    setQty(id, b.dataset.act === "dec" ? q - 1 : q + 1);
    const r = $(`.row[data-id="${id}"] .row-ctl`); if (r) r.innerHTML = ctlHTML(byId(id));
    updateCartUI(false);
    const again = $(`#order-lines li[data-id="${id}"] [data-act="${b.dataset.act}"]`); if (again) again.focus();
  });
  function syncMethod() {
    const del = $("input[name=method]:checked").value === "Delivery";
    $("#addr-label").innerHTML = del ? "Delivery address" : "Your address <small>(optional for pickup)</small>";
    $("#o-addr").required = del;
  }
  $$("input[name=method]").forEach((r) => r.addEventListener("change", syncMethod));
  const syncOther = () => {
    const on = $("#o-other").checked;
    $("#collector-field").hidden = !on;
    $("#phone-label").textContent = on ? "Collector's contact number" : "Contact number of the person collecting";
  };
  $("#o-other").addEventListener("change", syncOther);
  const cleanPhone = (v) => { // 07XX / 01XX / +254 / 254 -> 2547XXXXXXXX, else null
    const d = v.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const n = /^0[17]\d{8}$/.test(d) ? "254" + d.slice(1) : /^254[17]\d{8}$/.test(d) ? d : /^[17]\d{8}$/.test(d) ? "254" + d : null;
    return n;
  };
  const isPlaceholderNumber = () => /^2547000000/.test(data.settings.whatsapp || "") || !data.settings.whatsapp;
  const clock = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${two(m)} ${h < 12 ? "AM" : "PM"}`; };
  const niceDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
  function waURL(text) { return `https://wa.me/${data.settings.whatsapp || ""}?text=${encodeURIComponent(text)}`; }
  function soloLink(m) { return waURL(`Hi Susan's Bagel Bakery! I'd like to order 1 × ${m.name} (${kes(m.price_kes)}). Is it available?`); }
  function buildMessage(f) {
    const L = lines(), { sum } = totals();
    const out = ["Hi Susan's Bagel Bakery! I'd like to order:", ""];
    L.forEach(({ item, qty }) => out.push(`• ${qty} × ${item.name} (${kes(qty * item.price_kes)})`));
    out.push("", `Total: ${kes(sum)} (estimate)`, "", `Ordered by: ${f.name}`, f.method);
    if (f.address) out.push(`${f.method === "Delivery" ? "Deliver to" : "Address"}: ${f.address}`);
    out.push(`Collector: ${f.other && f.collector ? f.collector : f.name}, +${f.phoneIntl}`);
    out.push(`When: ${niceDate(f.date)}, ${clock(f.time)}`);
    if (f.notes) out.push(`Notes: ${f.notes}`);
    out.push("", "Sent from the website.");
    return out.join("\n");
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form)); const msg = $("#order-msg");
    $$(".bad", form).forEach((x) => { x.classList.remove("bad"); x.removeAttribute("aria-invalid"); });
    const fail = (sel, text) => { const f = $(sel); f.classList.add("bad"); f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", "order-msg"); f.focus(); msg.className = "form-msg err"; msg.textContent = text; };
    const min = Number(data.settings.min_order_kes || 0), { sum } = totals();
    if (!fd.name.trim()) return fail("#o-name", "Add your name so we know who the order is for.");
    if (fd.method === "Delivery" && !fd.address.trim()) return fail("#o-addr", "Add a delivery address.");
    if (fd.other && !fd.collector.trim()) return fail("#o-cname", "Add the name of the person collecting.");
    const phoneIntl = cleanPhone(fd.phone || "");
    if (!phoneIntl) return fail("#o-phone", "Add a Kenyan phone number, like 0712 345 678.");
    if (!fd.date || fd.date < localISO(new Date())) return fail("#o-date", "Pick today or a later day.");
    if (!fd.time) return fail("#o-time", "Pick a time.");
    if (min && sum < min) { msg.className = "form-msg err"; msg.textContent = `Minimum order is ${kes(min)}.`; return; }
    msg.textContent = "";
    store.set("bagel-customer-v1", { name: fd.name.trim(), address: fd.address.trim(), method: fd.method, phone: fd.phone.trim() });
    const url = waURL(buildMessage({ ...fd, name: fd.name.trim(), address: fd.address.trim(), notes: fd.notes.trim(), collector: (fd.collector || "").trim(), other: !!fd.other, phoneIntl }));
    $("#wa-retry").href = url;
    $("#order-body").hidden = true; $("#order-done").hidden = false; $("#done-title").focus();
    const w = window.open(url, "_blank", "noopener"); if (!w) location.href = url;
  });
  $("#order-reset").addEventListener("click", () => { cart = {}; store.set("bagel-cart-v1", cart); form.reset(); dlg.close(); renderMenu(); updateCartUI(false); });
  const closeOrder = () => dlg.close();
  $("#order-close").addEventListener("click", closeOrder);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeOrder(); });
  dlg.addEventListener("close", () => updateCartUI(false));
  $("#cart-pill").addEventListener("click", openOrder);
  $("#bar-open").addEventListener("click", openOrder);

  /* ---------- settings + reviews ---------- */
  function applySettings() {
    const s = data.settings;
    $$("[data-s]").forEach((el) => { if (s[el.dataset.s] != null) el.textContent = s[el.dataset.s]; });
    const em = $("#email-link"); if (em && s.email) em.href = "mailto:" + s.email;
    $("#wa-link").href = `https://wa.me/${s.whatsapp}`;
    $$('a[href*="instagram.com"]').forEach((a) => (a.href = `https://www.instagram.com/${s.instagram}/`));
    const g = $("#google-review"); g.hidden = !s.google_review_url; if (s.google_review_url) g.href = s.google_review_url;
  }
  const starsRow = (n) => `<span class="stars-row" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<svg viewBox="0 0 24 24" class="${i <= n ? "" : "off"}" aria-hidden="true"><path d="m12 2.8 2.8 6 6.5.8-4.8 4.5 1.3 6.4L12 17.2 6.2 20.5l1.3-6.4L2.7 9.6l6.5-.8z"/></svg>`).join("")}</span>`;
  function renderReviews() {
    const wall = $("#review-wall"), sum = $("#rating-summary");
    wall.innerHTML = data.reviews.length
      ? data.reviews.map((r) => `<article class="ticket">${starsRow(r.rating)}<p>${esc(r.comment)}</p><footer><span>${esc(r.name)}</span><time datetime="${esc(r.created_at)}">${new Date(r.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}</time></footer></article>`).join("")
      : `<p class="empty">No reviews yet. Yours could be the first.</p>`;
    sum.hidden = !data.rating.count;
    if (data.rating.count) sum.innerHTML = `${data.rating.average.toFixed(1)} ${starsRow(Math.round(data.rating.average))}<small>from ${data.rating.count} review${data.rating.count === 1 ? "" : "s"}</small>`;
    observe($$(".ticket", wall));
  }
  $("#review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, msg = $("#review-msg"), fd = Object.fromEntries(new FormData(f));
    const say = (t, c) => { msg.textContent = t; msg.className = "form-msg " + c; };
    const bad = (id, t) => { const el = $(id); el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", "review-msg"); el.focus(); say(t, "err"); };
    $$("[aria-invalid]", f).forEach((x) => x.removeAttribute("aria-invalid"));
    if (!fd.name.trim()) return bad("#rv-name", "Add your name.");
    if (!fd.rating) { $("#st5").focus(); return say("Pick a star rating.", "err"); }
    if (fd.comment.trim().length < 3) return bad("#rv-comment", "Write a few words about your bagels.");
    const btn = $("button[type=submit]", f); btn.disabled = true; say("Sending...", "ok");
    try {
      if (!API) throw new Error("no api");
      const r = await fetch(API + "/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fd.name.trim(), rating: +fd.rating, comment: fd.comment.trim(), website: fd.website || "" }) });
      if (r.status === 429) throw new Error("rate");
      if (!r.ok) throw new Error("bad");
      f.reset(); say("Thank you! We read every review, and yours will appear once we have.", "ok");
    } catch (err) {
      const text = `Hi Susan's Bagel Bakery! My review: ${fd.rating}/5. ${fd.comment.trim()} (${fd.name.trim()})`;
      msg.className = "form-msg err";
      msg.innerHTML = err.message === "rate" ? "That is a lot of reviews from one place. Try again later." : `We could not send that just now. <a href="${esc(waURL(text))}" target="_blank" rel="noopener">Send it on WhatsApp instead</a>.`;
    } finally { btn.disabled = false; }
  });

  /* ---------- motion helpers ---------- */
  const io = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 })
    : null;
  function observe(els) { if (io) els.forEach((el) => io.observe(el)); }
  observe($$(".reveal"));
  const bar = $("#top-bar");
  addEventListener("scroll", () => bar.classList.toggle("stuck", scrollY > 8), { passive: true });
  const heroArt = $("#hero-art"), wrap = $("#badge-wrap");
  if (!reduceMotion && matchMedia("(pointer: fine)").matches) {
    heroArt.addEventListener("pointermove", (e) => {
      const r = heroArt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      wrap.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
    });
    heroArt.addEventListener("pointerleave", () => (wrap.style.transform = ""));
  }
  const tick = $(".ticker");
  tick.addEventListener("click", () => tick.classList.toggle("paused"));
  $("#yr").textContent = new Date().getFullYear();

  /* ---------- load data: baked menu.json first, live API when it answers ---------- */
  function adopt(d) {
    data = d;
    // drop cart lines for items that no longer exist
    Object.keys(cart).forEach((id) => { if (!byId(id)) delete cart[id]; });
    applySettings(); renderMenu(); renderReviews(); updateCartUI(false);
  }
  async function load() {
    try { adopt(await (await fetch("menu.json", { cache: "no-cache" })).json()); }
    catch { const c = store.get("bagel-data-v1"); if (c) adopt(c); }
    if (!API) return;
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(API + "/api/public", { signal: ctl.signal });
      if (!r.ok) throw new Error(r.status);
      const live = await r.json(); store.set("bagel-data-v1", live); adopt(live);
    } catch {
      if (!data.menu.length) { const c = store.get("bagel-data-v1"); if (c) adopt(c); }
      const n = document.createElement("p"); n.className = "menu-error";
      n.textContent = "Showing our saved menu. We confirm final prices on WhatsApp.";
      $(".slip-foot").before(n);
    } finally { clearTimeout(t); }
  }
  load();
})();
