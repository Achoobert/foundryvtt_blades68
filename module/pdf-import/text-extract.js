export async function getPageItems(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const content = await page.getTextContent();
  const [, , width] = page.view;
  const items = content.items
    .filter((item) => item.str.trim().length)
    .map((item) => ({
      str: item.str,
      font: item.fontName,
      x: item.transform[4],
      y: item.transform[5],
      h: item.height
    }));
  return { width, items };
}

export async function getRangeItems(pdfDoc, startPage, endPage) {
  const pages = [];
  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
    const { width, items } = await getPageItems(pdfDoc, pageNumber);
    pages.push({ pageNumber, width, items });
  }
  return pages;
}

/**
 * Re-orders a page's items into natural reading order for a layout with up
 * to two columns: left column top-to-bottom, then right column top-to-bottom.
 */
export function readingOrder(items, pageWidth) {
  const midpoint = pageWidth / 2;
  const left = items.filter((item) => item.x < midpoint).sort((a, b) => b.y - a.y);
  const right = items.filter((item) => item.x >= midpoint).sort((a, b) => b.y - a.y);
  return [...left, ...right];
}

/**
 * Merges consecutive items that share a font into one — PDF text extraction
 * frequently splits a single visual phrase (a two-word label, "Tier IV (W)")
 * across several items, which would otherwise be misread as separate tokens.
 */
export function mergeConsecutiveSameFont(items) {
  const merged = [];
  for (const item of items) {
    const last = merged[merged.length - 1];
    if (last && last.font === item.font && Math.abs(last.y - item.y) < 0.5) {
      last.str += item.str;
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

/**
 * Determines the most common font across a set of items — the working
 * assumption is that body text is always the majority font, and any other
 * font marks a heading/label (a name, a section title, a field label).
 */
export function findBodyFont(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.font, (counts.get(item.font) ?? 0) + item.str.length);
  }
  let bodyFont = null;
  let max = -1;
  for (const [font, count] of counts) {
    if (count > max) {
      max = count;
      bodyFont = font;
    }
  }
  return bodyFont;
}

/**
 * Splits a flat list of items (already in reading order) into blocks, where
 * each block starts at an item using a non-body font (a heading/label) and
 * continues until the next such item. Items before the first heading are
 * returned as a "preamble" block with a null heading.
 */
export function splitIntoLabeledBlocks(items, bodyFont) {
  const blocks = [];
  let current = { heading: null, headingItems: [], bodyItems: [] };

  for (const item of items) {
    const isHeading = item.font !== bodyFont;
    if (isHeading && current.bodyItems.length) {
      blocks.push(current);
      current = { heading: null, headingItems: [], bodyItems: [] };
    }
    if (isHeading) {
      current.headingItems.push(item);
    } else {
      current.bodyItems.push(item);
    }
  }
  blocks.push(current);

  for (const block of blocks) {
    block.heading = block.headingItems.map((i) => i.str).join('').trim();
    block.body = block.bodyItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  }

  return blocks.filter((block) => block.heading || block.body);
}
