const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

const count = (el) => {
  const to = Number(el.dataset.count);
  if (reduce) { el.textContent = to; return; }
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / 1200, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(count);
    io.unobserve(e.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

const watch = (el) => io.observe(el);
document.querySelectorAll("[data-reveal], .panel").forEach(watch);

const scrub = document.querySelector(".scrub");
const words = scrub.textContent.trim().split(/\s+/);
scrub.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
const spans = [...scrub.querySelectorAll(".w")];
const bar = document.querySelector(".progress");

const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.setProperty("--p", max > 0 ? scrollY / max : 0);
  const r = scrub.getBoundingClientRect();
  const p = Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3), 0), 1);
  const n = Math.round(p * spans.length);
  spans.forEach((s, i) => s.classList.toggle("on", i < n));
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

if (fine && !reduce) {
  const split = document.querySelector(".split");
  const ring = document.querySelector(".ring");
  let x = 0, y = 0, rx = 0, ry = 0;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    ring.classList.add("on");
    const r = split.getBoundingClientRect();
    if (r.bottom > 0) {
      split.style.setProperty("--mx", (x / innerWidth - 0.5) * 2);
      split.style.setProperty("--my", (y / innerHeight - 0.5) * 2);
    }
  });
  const loop = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener("pointerover", (e) => {
    ring.classList.toggle("big", !!e.target.closest("a, button, .half, .work"));
  });
}

const lb = document.getElementById("lb");
const lbImg = lb.querySelector("img");
const lbVid = lb.querySelector("video");
const lbCap = lb.querySelector("figcaption");
let list = [];
let index = 0;

const show = (i) => {
  index = (i + list.length) % list.length;
  const it = list[index];
  if (it.type === "video") {
    lbImg.hidden = true;
    lbVid.hidden = false;
    lbVid.src = it.src;
    lbVid.play().catch(() => {});
  } else {
    lbVid.pause();
    lbVid.removeAttribute("src");
    lbVid.hidden = true;
    lbImg.hidden = false;
    lbImg.src = it.src;
    lbImg.alt = it.title;
  }
  lbCap.textContent = `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")} · ${it.title}`;
};

const open = (items, i) => {
  list = items;
  show(i);
  if (!lb.open) lb.showModal();
};

lb.addEventListener("close", () => { lbVid.pause(); });
lb.querySelector(".lb-x").addEventListener("click", () => lb.close());
lb.querySelector(".prev").addEventListener("click", () => show(index - 1));
lb.querySelector(".next").addEventListener("click", () => show(index + 1));
lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") show(index - 1);
  if (e.key === "ArrowRight") show(index + 1);
});

let touchX = 0;
lb.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
}, { passive: true });

const labels = { cards: "Картки товару", business: "Візитки", video: "Відео" };
const order = ["cards", "business", "video"];
const emptyHtml = '<div class="empty"><p>Поки що нема проєктів</p></div>';

const tile = (it, i) => {
  const num = String(i + 1).padStart(2, "0");
  const media = it.type === "video"
    ? `<video src="${it.src}#t=0.1" muted loop playsinline preload="metadata"></video><span class="play" aria-hidden="true">Відео</span>`
    : `<img src="${it.src}" alt="${it.title}" loading="lazy" decoding="async">`;
  return `<figure class="work" data-reveal data-i="${i}">
    <button type="button" aria-label="Відкрити: ${it.title}">${media}</button>
    <figcaption><span>${num}</span><span>${it.title}</span></figcaption>
  </figure>`;
};

const build = (box, all) => {
  if (!all.length) { box.innerHTML = emptyHtml; return; }
  const cats = order.filter((c) => all.some((i) => i.cat === c));
  const chips = cats.length > 1
    ? `<div class="filters">${["all", ...cats].map((c, n) => `<button type="button" class="chip${n === 0 ? " on" : ""}" data-cat="${c}">${c === "all" ? "Усі" : labels[c]}</button>`).join("")}</div>`
    : "";
  box.innerHTML = `${chips}<div class="grid"></div>`;
  const grid = box.querySelector(".grid");
  let visible = all;

  const draw = (cat) => {
    visible = cat === "all" ? all : all.filter((i) => i.cat === cat);
    grid.innerHTML = visible.map(tile).join("");
    grid.querySelectorAll("[data-reveal]").forEach(watch);
  };
  draw("all");

  box.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === chip));
      draw(chip.dataset.cat);
      return;
    }
    const fig = e.target.closest(".work");
    if (fig) open(visible, Number(fig.dataset.i));
  });

  grid.addEventListener("pointerover", (e) => {
    const fig = e.target.closest(".work");
    grid.querySelectorAll("video").forEach((v) => v.pause());
    const v = fig && fig.querySelector("video");
    if (v) v.play().catch(() => {});
  });
  grid.addEventListener("pointerleave", () => grid.querySelectorAll("video").forEach((v) => v.pause()));
};

fetch("projects.json")
  .then((r) => r.json())
  .catch(() => ({}))
  .then((data) => {
    document.querySelectorAll("[data-folder]").forEach((box) => build(box, data[box.dataset.folder] || []));
  });
