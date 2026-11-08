/* Comportamente pentru panoul de administrare. */

import { renderProductSvg } from './shared/illustrations.js';

// Confirmare pentru acțiunile ireversibile
document.addEventListener('submit', (event) => {
  const message = event.target?.dataset?.confirm;
  if (message && !window.confirm(message)) event.preventDefault();
});

// Tipărire
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-print]')) window.print();
});

// Filtre care se aplică imediat
for (const el of document.querySelectorAll('[data-autosubmit]')) {
  el.addEventListener('change', () => el.form?.requestSubmit());
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------------------------- Formularul de produs ---------------------------- */

const productForm = document.querySelector('[data-product-form]');
if (productForm) {
  const source = productForm.querySelector('[data-slug-source]');
  const target = productForm.querySelector('[data-slug-target]');
  let touched = Boolean(target?.value) || target?.hasAttribute('data-slug-locked');
  target?.addEventListener('input', () => {
    touched = true;
  });
  source?.addEventListener('input', () => {
    if (!touched && target) target.value = slugify(source.value);
  });

  const rows = productForm.querySelector('[data-variant-rows]');
  const template = document.querySelector('[data-variant-template]');
  const renumber = () => {
    [...rows.querySelectorAll('[data-variant-row]')].forEach((row, index) => {
      for (const input of row.querySelectorAll('input')) {
        const key = input.dataset.name || (/\]\[(\w+)\]$/.exec(input.name) || [])[1];
        if (!key) continue;
        input.dataset.name = key;
        input.name = `variants[${index}][${key}]`;
      }
    });
  };
  productForm.querySelector('[data-add-variant]')?.addEventListener('click', () => {
    rows.append(template.content.cloneNode(true));
    renumber();
    rows.lastElementChild?.querySelector('input[data-name="label"]')?.focus();
  });
  rows?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-variant]');
    if (!button) return;
    if (rows.querySelectorAll('[data-variant-row]').length <= 1) {
      window.alert('Produsul trebuie să aibă cel puțin o variantă.');
      return;
    }
    button.closest('[data-variant-row]').remove();
    renumber();
  });
  if (rows) renumber();

  const visual = productForm.querySelector('[data-visual-json]');
  const preview = productForm.querySelector('[data-visual-preview]');
  if (visual && preview) {
    const render = () => {
      try {
        const value = JSON.parse(visual.value || '{}');
        preview.innerHTML = renderProductSvg(value, { seed: 'previzualizare', uid: 'previzualizare' });
        visual.removeAttribute('aria-invalid');
      } catch {
        visual.setAttribute('aria-invalid', 'true');
      }
    };
    visual.addEventListener('input', debounce(render, 300));
    visual.closest('details')?.addEventListener('toggle', render, { once: true });
  }
}

/* ---------------------------- Încărcarea imaginilor ---------------------------- */

async function resizeImage(file, max = 1600) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
  if (webp && webp.type === 'image/webp') return webp;
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}

const upload = document.querySelector('[data-image-upload]');
if (upload) {
  const status = document.querySelector('[data-upload-status]');
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    status.textContent = 'Se pregătește imaginea…';
    try {
      const blob = await resizeImage(file);
      status.textContent = 'Se încarcă…';
      const res = await fetch(upload.dataset.uploadUrl, {
        method: 'POST',
        headers: { 'content-type': blob.type || file.type, 'x-csrf-token': upload.dataset.csrf },
        body: blob,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Încărcarea a eșuat. Încearcă din nou.');
      window.location.href = `${window.location.pathname}?mesaj=imagine`;
    } catch (err) {
      status.textContent = err.message;
      upload.value = '';
    }
  });
}
