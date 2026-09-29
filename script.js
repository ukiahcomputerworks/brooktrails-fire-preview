(() => {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-nav]');

  if (toggle && nav) {
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = [
    ...document.querySelectorAll(
      '.section-intro, .service-card, .action-grid > a, .story-grid > *, .two-column > *, .split-feature > *, .metric-row > *, .contact-directory > article'
    ),
  ];

  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealTargets.forEach((node, index) => {
      node.classList.add('reveal-ready');
      node.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    revealTargets.forEach((node) => revealObserver.observe(node));
  }

  document.querySelectorAll('.service-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    });
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const search = document.querySelector('[data-resource-search]');
  const items = [...document.querySelectorAll('[data-resource-item]')];
  const empty = document.querySelector('[data-resource-empty]');
  if (search && items.length) {
    const filterResources = () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const match = !query || item.dataset.search.includes(query);
        item.hidden = !match;
        if (match) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
    };
    search.addEventListener('input', filterResources);
  }
})();
