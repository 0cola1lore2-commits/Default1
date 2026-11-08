import { iconMarkup } from '../../public/js/shared/icons.js';
import { raw } from '../lib/html.js';

export function icon(name, opts) {
  return raw(iconMarkup(name, opts));
}
