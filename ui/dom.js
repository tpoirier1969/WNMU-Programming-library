export const els = {
  pageRoot: document.getElementById("pageRoot"),
  modal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

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
  if (typeof els.modal.close === "function") {
    try { els.modal.close(); } catch {}
  }
  els.modal.removeAttribute("open");
}
