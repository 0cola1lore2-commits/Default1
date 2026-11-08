import express from 'express';
import { placeOrder } from '../lib/orders.js';
import { quoteCart } from '../lib/pricing.js';
import { buildSchedule } from '../lib/schedule.js';
import { rateLimit } from '../lib/security.js';

export function baseUrl(req, env) {
  return env.siteUrl || `${req.protocol}://${req.get('host')}`;
}

export function apiRoutes({ store, env, notifier, clock, logger = console }) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  /** Calculează coșul (prețuri, reduceri, livrare) și, la cerere, programul disponibil. */
  router.post('/cos', (req, res) => {
    const settings = store.getSettings();
    const now = clock();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const quote = quoteCart(store, body, { now, settings });
    const schedule = body.withSchedule ? buildSchedule({ now, leadTimeHours: quote.leadTimeHours, fulfillment: quote.fulfillment, settings }) : null;
    res.json({ ...quote, schedule, ordersEnabled: settings.ordersEnabled, ordersPausedMessage: settings.ordersEnabled ? '' : settings.ordersPausedMessage });
  });

  const orderLimiter = rateLimit({
    windowMs: 10 * 60_000,
    max: 8,
    onLimit: (req, res) => res.status(429).json({ error: 'Ai trimis prea multe comenzi într-un timp scurt. Te rugăm să încerci din nou peste câteva minute sau să ne suni.' }),
  });

  router.post('/comenzi', orderLimiter, (req, res) => {
    const settings = store.getSettings();
    const result = placeOrder(store, req.body, { now: clock(), settings });
    if (result.status !== 201) {
      return res.status(result.status).json({ error: result.error, errors: result.errors || null, quote: result.quote || null });
    }
    const { order } = result;
    const items = store.getOrderItems(order.id);
    notifier.orderPlaced(order, items, baseUrl(req, env)).catch((err) => logger.error('Notificare eșuată:', err));
    return res.status(201).json({
      number: order.number,
      url: `/comanda/${order.number}?t=${encodeURIComponent(order.token)}&nou=1`,
    });
  });

  return router;
}
