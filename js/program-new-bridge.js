// v1.5.51 standalone Add Program helper
// Sends a one-time notice to the Library tab after a successful save.

(function () {
  const CHANNEL_NAME = 'wnmu-program-library';

  function text(value) {
    return (value ?? '').toString().trim();
  }

  function returnToLibrary(event) {
    const link = event.target?.closest?.('a[href="index.html"], #backToLibraryTop, [data-return-library]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
        window.close();
        return;
      }
    } catch (error) {
      console.warn('Original Library tab was not reachable:', error);
    }

    window.location.href = 'index.html';
  }

  function sendProgramCreated(programId, title) {
    if (!programId || !('BroadcastChannel' in window)) return;
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({
        type: 'program-created',
        id: programId,
        title: title || 'new program',
        savedAt: Date.now()
      });
      channel.close();
    } catch (error) {
      console.warn('Program-created notice was skipped:', error);
    }
  }

  function patchSaveHandler() {
    if (window.__wnmuProgramNewBridgePatched || typeof saveProgram !== 'function') return;
    window.__wnmuProgramNewBridgePatched = true;
    const originalSaveProgram = saveProgram;

    saveProgram = async function patchedSaveProgram(event) {
      const titleBeforeSave = text(document.querySelector('#programForm [name="title"]')?.value);
      const previousSavedId = state?.lastSavedId ?? null;
      const result = await originalSaveProgram.apply(this, arguments);
      const nextSavedId = state?.lastSavedId ?? null;
      if (nextSavedId && String(nextSavedId) !== String(previousSavedId || '')) {
        sendProgramCreated(nextSavedId, titleBeforeSave);
      }
      return result;
    };
  }

  document.addEventListener('click', returnToLibrary, true);
  document.addEventListener('DOMContentLoaded', patchSaveHandler);
})();
