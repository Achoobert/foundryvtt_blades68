import { BLADES68 } from '../config.js';

const TAB_ITEM_TYPES = {
  upgrades: ['upgrade'],
  cohorts: ['cohort'],
  claims: ['claim'],
  abilities: ['crew-ability']
};

export default function registerHandlebarsHelpers() {
  Handlebars.registerHelper('actionsFor', (attribute) => BLADES68.ACTIONS[attribute] ?? []);

  Handlebars.registerHelper(
    'actionRating',
    (system, attribute, action) => system?.attributes?.[attribute]?.actions?.[action] ?? 0
  );

  Handlebars.registerHelper('clockSegments', (value, max) => {
    const cx = 50;
    const cy = 50;
    const radius = 45;
    const filledUpTo = value ?? 0;
    const segmentCount = Math.max(1, max ?? 1);

    if (segmentCount === 1) {
      return [{ index: 1, filled: filledUpTo >= 1, fullCircle: true }];
    }

    const segments = [];
    const anglePerSegment = 360 / segmentCount;
    for (let i = 0; i < segmentCount; i++) {
      const startRad = ((i * anglePerSegment - 90) * Math.PI) / 180;
      const endRad = (((i + 1) * anglePerSegment - 90) * Math.PI) / 180;
      const x0 = (cx + radius * Math.cos(startRad)).toFixed(2);
      const y0 = (cy + radius * Math.sin(startRad)).toFixed(2);
      const x1 = (cx + radius * Math.cos(endRad)).toFixed(2);
      const y1 = (cy + radius * Math.sin(endRad)).toFixed(2);
      segments.push({
        index: i + 1,
        filled: i + 1 <= filledUpTo,
        path: `M${cx},${cy} L${x0},${y0} A${radius},${radius} 0 0,1 ${x1},${y1} Z`
      });
    }
    return segments;
  });

  Handlebars.registerHelper('dotsFor', (value, max) => {
    const dots = [];
    const filledUpTo = value ?? 0;
    for (let n = 1; n <= max; n++) dots.push({ value: n, filled: n <= filledUpTo });
    return dots;
  });

  Handlebars.registerHelper('loadBoxes', (load) => {
    const count = Math.max(1, Number(load) || 0);
    return Array.from({ length: count }, (_, i) => i);
  });

  Handlebars.registerHelper('concat', (...args) => args.slice(0, -1).join(''));

  Handlebars.registerHelper('array', (...args) => args.slice(0, -1));

  Handlebars.registerHelper('ifEquals', function (a, b, options) {
    const isEqual = a === b;
    if (options && typeof options.fn === 'function') {
      return isEqual ? options.fn(this) : options.inverse(this);
    }
    return isEqual;
  });

  Handlebars.registerHelper('ifItemTypeMatches', function (itemType, tabId, options) {
    const matches = (TAB_ITEM_TYPES[tabId] ?? []).includes(itemType);
    return matches ? options.fn(this) : options.inverse(this);
  });
}
