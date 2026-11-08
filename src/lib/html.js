/*
 * Șabloane HTML cu escapare automată.
 *   html`<p>${text}</p>`   — orice valoare este escapată, cu excepția
 *   rezultatelor altor șabloane html`` sau raw().
 */

import { SafeHtml, escapeHtml, html, raw } from '../../public/js/shared/html.js';

export { SafeHtml, escapeHtml, html, raw };

/** JSON care poate fi pus în siguranță într-un <script>. */
export function jsonForScript(data) {
  return raw(
    JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029'),
  );
}

export function cx(...names) {
  return names.filter(Boolean).join(' ');
}

/** Transformă un text cu rânduri goale în paragrafe <p>. */
export function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => html`<p>${p}</p>`);
}
