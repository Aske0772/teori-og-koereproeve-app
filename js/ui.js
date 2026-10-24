// Små hjælpere til skærmene.
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content; };
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const go = (hash) => { location.hash = hash; };

export function topbar(title, { back = '#/traen', step = '' } = {}) {
  return `<div class="topbar">
    <button class="back" onclick="location.hash='${back}'" aria-label="Tilbage">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${esc(title)}
    </button>
    <span class="step">${esc(step)}</span>
  </div>`;
}

