import { renderDashboard as baseRenderDashboard } from "./pages-mainfix4.js?v=2026-04-17-34";

const HOME_WARNING = `<section class="detail-card section-block safety-callout warning"><h3>Use this guide carefully</h3><p>This guide was put together by an amateur forager, not a scientist. All mushrooms must be correctly identified before eating.</p><p>I built it for myself as a reminder tool. I know just enough to be dangerous, and I do not use this knowledge often enough to keep every detail committed to memory.</p></section>`;

export function renderDashboard(args) {
  const html = baseRenderDashboard(args);
  if (args?.page !== "home") return html;
  if (html.includes("Use this guide carefully")) return html;
  return html.replace('<div class="in-focus-layout">', `${HOME_WARNING}<div class="in-focus-layout">`);
}
