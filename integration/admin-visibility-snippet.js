if (els.quarterlyIssuesReportBtn) {
  const admin = canEdit();
  els.quarterlyIssuesReportBtn.classList.toggle('hidden', !admin);
  els.quarterlyIssuesReportBtn.setAttribute('aria-hidden', admin ? 'false' : 'true');
}
