export const els = {
  pageRoot: document.getElementById("pageRoot"),
  modal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

let lightboxEls = null;
let lightboxEscapeBound = false;

function lightboxHost() {
  if (els.modal?.hasAttribute?.("open")) return els.modal;
  return document.body;
}

function applyLightboxInlineStyles(shell) {
  shell.style.position = "fixed";
  shell.style.inset = "0";
  shell.style.zIndex = "2147483000";
  shell.style.alignItems = "center";
  shell.style.justifyContent = "center";
  shell.style.padding = "18px";
  shell.style.background = "rgba(20, 23, 20, 0.72)";
  shell.style.overflow = "auto";

  const backdrop = shell.querySelector(".image-lightbox-backdrop");
  if (backdrop) {
    backdrop.style.position = "fixed";
    backdrop.style.inset = "0";
    backdrop.style.zIndex = "0";
  }

  const card = shell.querySelector(".image-lightbox-card");
  if (card) {
    card.style.position = "relative";
    card.style.zIndex = "1";
    card.style.width = "min(1100px, 96vw)";
    card.style.maxHeight = "92vh";
    card.style.display = "grid";
    card.style.gridTemplateRows = "auto minmax(0, 1fr) auto";
    card.style.gap = "10px";
    card.style.padding = "14px";
    card.style.borderRadius = "18px";
    card.style.border = "1px solid rgba(255,255,255,.35)";
    card.style.background = "#fffdf9";
    card.style.boxShadow = "0 24px 72px rgba(0,0,0,.42)";
  }

  const close = shell.querySelector(".image-lightbox-close");
  if (close) close.style.justifySelf = "end";

  const body = shell.querySelector(".image-lightbox-body");
  if (body) {
    body.style.minHeight = "0";
    body.style.display = "flex";
    body.style.alignItems = "center";
    body.style.justifyContent = "center";
    body.style.overflow = "auto";
  }

  const image = shell.querySelector(".image-lightbox-image");
  if (image) {
    image.style.display = "block";
    image.style.maxWidth = "100%";
    image.style.maxHeight = "78vh";
    image.style.objectFit = "contain";
    image.style.borderRadius = "12px";
    image.style.background = "#f4f0e7";
  }

  const meta = shell.querySelector(".image-lightbox-meta");
  if (meta) {
    meta.style.display = "flex";
    meta.style.flexWrap = "wrap";
    meta.style.gap = "10px";
    meta.style.alignItems = "center";
    meta.style.justifyContent = "space-between";
  }
}

function ensureLightbox() {
  const host = lightboxHost();
  if (lightboxEls?.shell) {
    if (lightboxEls.shell.parentElement !== host) host.appendChild(lightboxEls.shell);
    applyLightboxInlineStyles(lightboxEls.shell);
    return lightboxEls;
  }

  const shell = document.createElement("div");
  shell.className = "image-lightbox";
  shell.hidden = true;
  shell.style.display = "none";
  shell.innerHTML = `
    <div class="image-lightbox-backdrop" data-lightbox-close></div>
    <div class="image-lightbox-card" role="dialog" aria-modal="true" aria-label="Expanded image">
      <button class="image-lightbox-close" type="button" data-lightbox-close aria-label="Close expanded image">Close</button>
      <div class="image-lightbox-body">
        <img class="image-lightbox-image" alt="">
      </div>
      <div class="image-lightbox-meta">
        <div class="image-lightbox-title" data-lightbox-title></div>
        <div class="image-lightbox-actions">
          <a class="buttonish subtle" hidden data-lightbox-source target="_blank" rel="noreferrer">Open source</a>
        </div>
      </div>
    </div>
  `;

  host.appendChild(shell);
  applyLightboxInlineStyles(shell);

  lightboxEls = {
    shell,
    image: shell.querySelector(".image-lightbox-image"),
    title: shell.querySelector("[data-lightbox-title]"),
    source: shell.querySelector("[data-lightbox-source]")
  };

  shell.querySelectorAll("[data-lightbox-close]").forEach((node) => {
    node.addEventListener("click", closeLightbox);
  });

  if (!lightboxEscapeBound) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightboxEls?.shell?.hidden) {
        event.preventDefault();
        closeLightbox();
      }
    });
    lightboxEscapeBound = true;
  }

  return lightboxEls;
}

export function renderPage(html) {
  els.pageRoot.innerHTML = html;
}

export function openModal(html) {
  els.modalContent.innerHTML = html;
  if (typeof els.modal.showModal === "function") {
    try { els.modal.showModal(); return; } catch {}
  }
  els.modal.setAttribute("open", "open");
}

export function closeModal() {
  closeLightbox();
  if (typeof els.modal.close === "function") {
    try { els.modal.close(); } catch {}
  }
  els.modal.removeAttribute("open");
}

export function openLightbox({ src = "", alt = "", title = "", sourceHref = "", sourceLabel = "Open source" } = {}) {
  if (!src) return;
  const refs = ensureLightbox();
  refs.image.src = src;
  refs.image.alt = alt || title || "Expanded image";
  refs.title.textContent = title || "";
  if (sourceHref) {
    refs.source.href = sourceHref;
    refs.source.textContent = sourceLabel || "Open source";
    refs.source.hidden = false;
  } else {
    refs.source.hidden = true;
    refs.source.removeAttribute("href");
  }
  refs.shell.hidden = false;
  refs.shell.style.display = "flex";
  document.body.style.overflow = "hidden";
  document.body.classList.add("lightbox-open");
}

export function closeLightbox() {
  if (!lightboxEls) return;
  lightboxEls.shell.hidden = true;
  lightboxEls.shell.style.display = "none";
  lightboxEls.image.removeAttribute("src");
  lightboxEls.image.alt = "";
  lightboxEls.title.textContent = "";
  lightboxEls.source.hidden = true;
  lightboxEls.source.removeAttribute("href");
  document.body.style.overflow = "";
  document.body.classList.remove("lightbox-open");
}
