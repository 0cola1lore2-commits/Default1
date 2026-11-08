/*
 * Notificări prin email (opțional). Dacă SMTP nu este configurat, mesajele
 * sunt doar afișate în consolă, iar comenzile se văd oricum în panoul de administrare.
 */

import nodemailer from 'nodemailer';
import { paymentMethods, shop } from '../config.js';
import { capitalize, formatDateKey, formatLei, formatSlot } from '../../public/js/shared/format.js';
import { escapeHtml } from './html.js';
import { formatPhone, statusLabel } from './orders.js';

function summaryLines(order, items) {
  const when = `${capitalize(formatDateKey(order.scheduledDate))}, ${formatSlot(order.scheduledSlot)}`;
  const where =
    order.fulfillment === 'livrare'
      ? `Livrare la: ${order.address}${order.addressDetails ? `, ${order.addressDetails}` : ''}`
      : `Ridicare din cofetărie: ${shop.address.street}, ${shop.address.locality}`;
  const payment = paymentMethods.find((p) => p.id === order.paymentMethod)?.label || order.paymentMethod;
  const lines = [`Comanda ${order.number}`, `Data: ${when}`, where, '', 'Produse:'];
  for (const item of items) {
    lines.push(`  ${item.quantity} × ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} — ${formatLei(item.lineTotal)}`);
    for (const d of item.custom?.details || []) lines.push(`      ${d}`);
  }
  lines.push('', `Subtotal: ${formatLei(order.subtotal)}`);
  if (order.discount) lines.push(`Reducere${order.promoCode ? ` (${order.promoCode})` : ''}: −${formatLei(order.discount)}`);
  if (order.fulfillment === 'livrare') lines.push(`Livrare: ${order.deliveryFee ? formatLei(order.deliveryFee) : 'gratuită'}`);
  lines.push(`Total: ${formatLei(order.total)}`, `Plată: ${payment}`);
  if (order.notes) lines.push('', `Observații: ${order.notes}`);
  return lines;
}

function wrapHtml(title, intro, lines, link) {
  return `<!doctype html><html lang="ro"><body style="margin:0;background:#fff8f2;font-family:Arial,Helvetica,sans-serif;color:#3a2320">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="font-size:22px;font-weight:bold;margin:0 0 16px;color:#b83a5e">${escapeHtml(shop.fullName)}</p>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 18px">${escapeHtml(intro)}</p>
<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;background:#fff;border:1px solid #eedfd5;border-radius:12px;padding:16px;margin:0 0 18px">${escapeHtml(lines.join('\n'))}</pre>
${link ? `<p style="margin:0 0 18px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#b83a5e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Vezi comanda</a></p>` : ''}
<p style="font-size:13px;color:#6e5550;line-height:1.5;margin:0">${escapeHtml(shop.fullName)} · ${escapeHtml(shop.address.street)}, ${escapeHtml(shop.address.locality)} · ${escapeHtml(shop.phone)}</p>
</div></body></html>`;
}

export function createNotifier(env, logger = console) {
  const transport = env.mail.host
    ? nodemailer.createTransport({
        host: env.mail.host,
        port: env.mail.port,
        secure: env.mail.secure,
        auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
      })
    : null;

  async function send(message) {
    if (!transport) {
      logger.log(`✉  [email neconfigurat] către ${message.to}: ${message.subject}`);
      return false;
    }
    try {
      await transport.sendMail({ from: env.mail.from, ...message });
      return true;
    } catch (err) {
      logger.error(`Emailul către ${message.to} nu a putut fi trimis: ${err.message}`);
      return false;
    }
  }

  return {
    enabled: !!transport,

    async orderPlaced(order, items, baseUrl) {
      const link = `${baseUrl}/comanda/${order.number}?t=${order.token}`;
      const lines = summaryLines(order, items);
      const intro = `Bună, ${order.customerName}! Am primit comanda ta și te vom contacta în scurt timp pentru confirmare. O poți urmări oricând aici: ${link}`;
      const transferNote =
        order.paymentMethod === 'transfer' ? ['', `Plata prin transfer: ${shop.company.name}, IBAN ${shop.company.iban} (${shop.company.bank}). Menționează numărul comenzii.`] : [];
      await Promise.all([
        send({
          to: order.customerEmail,
          subject: `Am primit comanda ${order.number} — ${shop.fullName}`,
          text: [intro, '', ...lines, ...transferNote, '', `${shop.fullName} · ${shop.phone}`].join('\n'),
          html: wrapHtml('Mulțumim pentru comandă!', intro, [...lines, ...transferNote], link),
        }),
        send({
          to: env.mail.notify,
          replyTo: order.customerEmail,
          subject: `Comandă nouă ${order.number} · ${formatLei(order.total)} · ${capitalize(formatDateKey(order.scheduledDate))}`,
          text: [
            `Client: ${order.customerName}`,
            `Telefon: ${formatPhone(order.customerPhone)}`,
            `Email: ${order.customerEmail}`,
            '',
            ...lines,
            '',
            `Administrare: ${baseUrl}/admin/comenzi/${order.id}`,
          ].join('\n'),
        }),
      ]);
    },

    async statusChanged(order, items, baseUrl) {
      if (!['confirmata', 'gata', 'in_livrare', 'anulata'].includes(order.status)) return;
      const label = statusLabel(order.status, { customer: true, fulfillment: order.fulfillment });
      const link = `${baseUrl}/comanda/${order.number}?t=${order.token}`;
      const intros = {
        confirmata: 'Comanda ta a fost confirmată. Ne apucăm de treabă!',
        gata: order.fulfillment === 'livrare' ? 'Comanda ta este gata și urmează să plece spre tine.' : 'Comanda ta este gata și te așteaptă în cofetărie.',
        in_livrare: 'Comanda ta este în drum spre tine.',
        anulata: 'Comanda ta a fost anulată. Dacă ai întrebări, ne poți contacta oricând.',
      };
      const lines = summaryLines(order, items);
      await send({
        to: order.customerEmail,
        subject: `Comanda ${order.number}: ${label}`,
        text: [intros[order.status], '', ...lines, '', link].join('\n'),
        html: wrapHtml(`Comanda ${order.number}: ${label}`, intros[order.status], lines, link),
      });
    },
  };
}
