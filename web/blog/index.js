import { initScrollTop } from '/js/shared/scrollTop.js';
import {
  ensureCardBaseContent,
  ensureSearchIndex,
  normalize,
  renderHighlights,
  reorderCards,
} from '/blog/searchUtils.js';
import { renderPager } from '/blog/pager.js';

const filterBtns = document.querySelectorAll('.filter-btn');
const postGrid = document.getElementById('postGrid');
const postSearch = document.getElementById('postSearch');
const searchCount = document.getElementById('searchCount');
const clearSearch = document.getElementById('clearSearch');
const searchStatus = document.getElementById('searchStatus');
const blogPager = document.getElementById('blogPager');
const allCards = Array.from(document.querySelectorAll('.card'));
const originalOrder = allCards.map((card, index) => ({ card, index }));

const PAGE_SIZE = 8;

let activeFilter = 'todos';
let searchQuery = '';
let searchIndexReady = false;
let currentPage = 1;

const setSearchMeta = (text, { loading = false, status = '' } = {}) => {
  searchCount.textContent = text;
  searchCount.classList.toggle('is-loading', loading);
  searchStatus.textContent = status;
  searchStatus.classList.toggle('visible', !!status);
};

const syncClearButton = () => {
  clearSearch.classList.toggle('visible', !!normalize(searchQuery));
};

const renderEmptyState = (visibleCount) => {
  const existing = document.getElementById('gridEmptyState');
  if (existing) existing.remove();
  if (visibleCount > 0) return;

  const empty = document.createElement('div');
  empty.id = 'gridEmptyState';
  empty.className = 'grid-empty';
  empty.textContent = searchQuery
    ? 'No hay posts que contengan esa búsqueda con el filtro actual.'
    : 'No hay posts en esta categoría ahora mismo.';

  postGrid.appendChild(empty);
};

const updateSearchStatus = (visibleCount) => {
  if (!searchQuery) {
    setSearchMeta(`${allCards.length} posts`);
    return;
  }

  const label = visibleCount === 1 ? 'resultado' : 'resultados';
  setSearchMeta(`${visibleCount} ${label}`);
};

const applyFilters = () => {
  const normalizedQuery = normalize(searchQuery);

  let visibleCards = allCards.filter((card) => {
    const category = card.getAttribute('data-category');
    const haystack = normalize(card.dataset.search || '');
    const categoryMatch = activeFilter === 'todos' || category === activeFilter;
    const queryMatch = !normalizedQuery
      || haystack.includes(normalizedQuery)
      || normalizedQuery.split(/\s+/).every((token) => haystack.includes(token));

    return categoryMatch && queryMatch;
  });

  visibleCards = reorderCards(normalizedQuery, visibleCards, originalOrder);

  const visibleCount = visibleCards.length;
  updateSearchStatus(visibleCount);
  syncClearButton();

  let pagedCards = visibleCards;
  if (visibleCount > PAGE_SIZE) {
    const start = (currentPage - 1) * PAGE_SIZE;
    pagedCards = visibleCards.slice(start, start + PAGE_SIZE);
  } else {
    currentPage = 1;
  }

  postGrid.innerHTML = '';
  pagedCards.forEach((card) => postGrid.appendChild(card));
  renderHighlights(pagedCards, searchQuery);
  renderEmptyState(visibleCount);
  renderPager({
    container: blogPager,
    total: visibleCount,
    page: currentPage,
    pageSize: PAGE_SIZE,
    onPageChange: (newPage) => {
      currentPage = newPage;
      applyFilters();
      window.scrollTo({ top: postGrid.offsetTop - 80, behavior: 'smooth' });
    },
  });
};

const handleFilterClick = (btn) => {
  activeFilter = btn.getAttribute('data-filter') || 'todos';
  filterBtns.forEach((item) => item.classList.remove('active'));
  btn.classList.add('active');
  currentPage = 1;
  applyFilters();
};

const handleSearchInput = async () => {
  searchQuery = postSearch.value || '';

  if (normalize(searchQuery) && !searchIndexReady) {
    setSearchMeta('Indexando...', {
      loading: true,
      status: 'Preparando el contenido completo de los posts para buscar dentro.',
    });
    await ensureSearchIndex(allCards);
    searchIndexReady = true;
  }

  currentPage = 1;
  applyFilters();
};

const handleClearSearch = () => {
  postSearch.value = '';
  searchQuery = '';
  currentPage = 1;
  applyFilters();
  postSearch.focus();
};

const initBlogIndex = () => {
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => handleFilterClick(btn));
  });

  postSearch.addEventListener('input', handleSearchInput);
  clearSearch.addEventListener('click', handleClearSearch);

  postSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !postSearch.value) return;
    event.preventDefault();
    handleClearSearch();
  });

  ensureCardBaseContent(allCards);
  setSearchMeta(`${allCards.length} posts`);
  applyFilters();
  initScrollTop({ buttonId: 'scrollTopBtn', threshold: 320 });
};

initBlogIndex();
