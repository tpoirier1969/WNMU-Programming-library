export function markActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.dataset.nav === route);
  });
}
