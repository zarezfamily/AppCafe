export function renderPager({
  container,
  total,
  page,
  pageSize,
  onPageChange,
}) {
  if (!container) return;

  if (total <= pageSize) {
    container.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  let html = '<div class="threads-pager"><div class="pager-nav">';
  html += `<button class="pager-btn pager-arrow" data-page="1" ${page === 1 ? 'disabled' : ''} aria-label="Primera página">«</button>`;
  html += `<button class="pager-btn pager-arrow" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>`;

  for (let nextPage = 1; nextPage <= totalPages; nextPage += 1) {
    if (totalPages > 11 && (nextPage > 2 && nextPage < page - 3)) {
      if (nextPage === 3) html += '<span class="pager-ellipsis">…</span>';
      continue;
    }

    if (totalPages > 11 && (nextPage < totalPages - 1 && nextPage > page + 3)) {
      if (nextPage === totalPages - 2) html += '<span class="pager-ellipsis">…</span>';
      continue;
    }

    html += `<button class="pager-btn${nextPage === page ? ' active' : ''}" data-page="${nextPage}">${nextPage}</button>`;
  }

  html += `<button class="pager-btn pager-arrow" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''} aria-label="Página siguiente">›</button>`;
  html += `<button class="pager-btn pager-arrow" data-page="${totalPages}" ${page === totalPages ? 'disabled' : ''} aria-label="Última página">»</button>`;
  html += '</div>';
  html += `<p class="pager-info">Mostrando posts del ${(page - 1) * pageSize + 1} al ${Math.min(page * pageSize, total)} de ${total}</p>`;
  html += '</div>';

  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPage = parseInt(btn.getAttribute('data-page'), 10);

      if (!btn.disabled && newPage >= 1 && newPage <= totalPages) {
        onPageChange(newPage);
      }
    });
  });
}
