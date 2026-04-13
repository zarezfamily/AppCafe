export const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const ensureCardBaseContent = (cards) => {
  cards.forEach((card) => {
    const title = card.querySelector('.card-title');
    const excerpt = card.querySelector('.card-excerpt');

    if (title && !card.dataset.baseTitle) card.dataset.baseTitle = title.textContent || '';
    if (excerpt && !card.dataset.baseExcerpt) card.dataset.baseExcerpt = excerpt.textContent || '';
  });
};

const buildHighlightTerms = (query) => {
  const raw = String(query || '').trim();
  if (!raw) return [];

  const normalizedPhrase = normalize(raw);
  const tokenTerms = normalizedPhrase.split(/\s+/).filter((token) => token.length >= 2);
  const merged = normalizedPhrase.includes(' ')
    ? [normalizedPhrase, ...tokenTerms]
    : tokenTerms;

  return Array.from(new Set(merged)).sort((a, b) => b.length - a.length);
};

const normalizeWithMap = (text) => {
  let normalizedText = '';
  const charMap = [];

  Array.from(String(text || '')).forEach((char, index) => {
    const normalizedChar = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for (const mappedChar of normalizedChar) {
      normalizedText += mappedChar;
      charMap.push(index);
    }
  });

  return { normalizedText, charMap };
};

const mergeRanges = (ranges) => {
  if (!ranges.length) return [];

  const sorted = ranges.slice().sort((a, b) => a.start - b.start);

  return sorted.reduce((acc, range) => {
    const last = acc[acc.length - 1];

    if (!last || range.start > last.end) {
      acc.push({ ...range });
      return acc;
    }

    last.end = Math.max(last.end, range.end);
    return acc;
  }, []);
};

export const highlightText = (text, query) => {
  const terms = buildHighlightTerms(query);
  if (!terms.length) return escapeHtml(text);

  const originalText = String(text || '');
  const { normalizedText, charMap } = normalizeWithMap(originalText);
  const ranges = [];

  terms.forEach((term) => {
    let searchFrom = 0;
    while (searchFrom < normalizedText.length) {
      const foundAt = normalizedText.indexOf(term, searchFrom);
      if (foundAt === -1) break;

      const start = charMap[foundAt];
      const endIndex = foundAt + term.length - 1;
      const end = (charMap[endIndex] ?? start) + 1;

      ranges.push({ start, end });
      searchFrom = foundAt + Math.max(term.length, 1);
    }
  });

  const mergedRanges = mergeRanges(ranges);
  if (!mergedRanges.length) return escapeHtml(originalText);

  let cursor = 0;
  let html = '';

  mergedRanges.forEach((range) => {
    html += escapeHtml(originalText.slice(cursor, range.start));
    html += `<mark class="search-hit">${escapeHtml(originalText.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  });

  html += escapeHtml(originalText.slice(cursor));
  return html;
};

export const renderHighlights = (cards, query) => {
  cards.forEach((card) => {
    const title = card.querySelector('.card-title');
    const excerpt = card.querySelector('.card-excerpt');
    const baseTitle = card.dataset.baseTitle || '';
    const baseExcerpt = card.dataset.baseExcerpt || '';

    if (title) title.innerHTML = highlightText(baseTitle, query);
    if (excerpt) excerpt.innerHTML = highlightText(baseExcerpt, query);
  });
};

const scoreCardMatch = (card, normalizedQuery) => {
  if (!normalizedQuery) return 0;

  const title = normalize(card.dataset.baseTitle || '');
  const excerpt = normalize(card.dataset.baseExcerpt || '');
  const haystack = normalize(card.dataset.search || '');
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  let score = 0;

  if (title.includes(normalizedQuery)) score += 120;
  if (excerpt.includes(normalizedQuery)) score += 55;
  if (haystack.includes(normalizedQuery)) score += 20;

  tokens.forEach((token) => {
    if (title.includes(token)) score += 22;
    if (excerpt.includes(token)) score += 10;
    if (haystack.includes(token)) score += 4;
  });

  return score;
};

export const reorderCards = (normalizedQuery, cards, originalOrder) => {
  const ranked = cards
    .map((card) => {
      const baseIndex = originalOrder.find((entry) => entry.card === card)?.index || 0;
      return { card, score: scoreCardMatch(card, normalizedQuery), baseIndex };
    })
    .sort((a, b) => {
      if (!normalizedQuery) return a.baseIndex - b.baseIndex;
      if (b.score !== a.score) return b.score - a.score;
      return a.baseIndex - b.baseIndex;
    });

  return ranked.map(({ card }) => card);
};

export const ensureSearchIndex = async (cards) => {
  await Promise.all(cards.map(async (card) => {
    const url = card.getAttribute('data-post-url');
    if (!url) return;

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const content = [
        doc.querySelector('title')?.textContent || '',
        doc.querySelector('.hero-title')?.textContent || '',
        doc.querySelector('.lead')?.textContent || '',
        doc.querySelector('.article')?.textContent || '',
      ].join(' ');

      card.dataset.search = `${card.dataset.search || ''} ${normalize(content)}`.trim();
    } catch (_) {
      /* ignore single post fetch failures */
    }
  }));
};
