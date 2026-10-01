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

  document.querySelectorAll('[data-site-search]').forEach(async (form) => {
    const input = form.querySelector('[data-site-search-input]');
    const results = form.querySelector('[data-site-search-results]');
    if (!input || !results) return;
    let items = [];
    let activeIndex = -1;

    const closeResults = () => {
      results.hidden = true;
      results.replaceChildren();
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    };

    const setActive = (index) => {
      const options = [...results.querySelectorAll('[role="option"]')];
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach((option, optionIndex) => option.classList.toggle('is-active', optionIndex === activeIndex));
      input.setAttribute('aria-activedescendant', options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block:'nearest' });
    };

    const renderResults = () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2 || !items.length) return closeResults();
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = items
        .map((item) => {
          const title = item.title.toLowerCase();
          const keywords = (item.keywords || '').toLowerCase();
          const haystack = `${item.title} ${item.detail} ${keywords}`.toLowerCase();
          if (!terms.every(term => haystack.includes(term))) return null;
          const relevance = title === query ? 0 : title.startsWith(query) ? 1 : title.includes(query) ? 2 : keywords.includes(query) ? 3 : 4;
          const typeWeight = item.type === 'Document' ? 2 : item.type === 'Guided path' || item.type === 'Direct answer' ? -1 : 0;
          const score = relevance + typeWeight;
          return { item, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title))
        .slice(0, 7);
      results.replaceChildren();
      matches.forEach(({ item }, index) => {
        const link = document.createElement('a');
        link.id = `${results.id}-option-${index}`;
        link.href = new URL(item.href, new URL(form.dataset.searchRoot, window.location.href)).href;
        link.setAttribute('role', 'option');
        const copy = document.createElement('span');
        const title = document.createElement('strong');
        const detail = document.createElement('small');
        const type = document.createElement('b');
        title.textContent = item.title;
        detail.textContent = item.detail;
        type.textContent = item.type;
        copy.append(title, detail);
        link.append(copy, type);
        results.append(link);
      });
      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'site-search-empty';
        empty.setAttribute('role', 'status');
        const message = document.createElement('strong');
        message.textContent = `No quick match for “${input.value.trim()}”`;
        const hint = document.createElement('small');
        hint.textContent = 'Press Enter to search every record, or try permit, moving, water, evacuation, or Board.';
        empty.append(message, hint);
        results.append(empty);
      }
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      activeIndex = -1;
    };

    try {
      const response = await fetch(form.dataset.searchIndex);
      if (response.ok) items = await response.json();
    } catch {
      items = [];
    }

    input.addEventListener('input', renderResults);
    input.addEventListener('focus', renderResults);
    input.addEventListener('keydown', (event) => {
      const options = [...results.querySelectorAll('[role="option"]')];
      if (event.key === 'ArrowDown' && options.length) { event.preventDefault(); setActive(activeIndex + 1); }
      if (event.key === 'ArrowUp' && options.length) { event.preventDefault(); setActive(activeIndex - 1); }
      if (event.key === 'Enter' && activeIndex >= 0 && options[activeIndex]) { event.preventDefault(); options[activeIndex].click(); }
      if (event.key === 'Escape') closeResults();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const choice = results.querySelector('.is-active, [role="option"]');
      if (choice) return choice.click();
      const destination = new URL('resources/', new URL(form.dataset.searchRoot, window.location.href));
      destination.searchParams.set('q', input.value.trim());
      window.location.assign(destination);
    });
    document.addEventListener('click', (event) => { if (!form.contains(event.target)) closeResults(); });
  });

  const topicBrief = document.querySelector('[data-contact-topic]');
  if (topicBrief) {
    const topic = new URLSearchParams(window.location.search).get('topic');
    const topics = {
      planning: {
        label:'Planning question',
        title:'Bring the address or assessor’s parcel number.',
        detail:'Describe the proposed work and ask about water and sewer availability, current design-review requirements, fees, plan copies, and the approved submission method.'
      },
      moving: {
        label:'Prospective resident question',
        title:'Ask what the district can confirm about the exact property.',
        detail:'Bring the address or assessor’s parcel number. Confirm district services and planning review here; County departments and other providers control many other property questions.'
      },
      trails: {
        label:'Trail or greenbelt report',
        title:'Name the trail, nearest landmark, and condition.',
        detail:'Include when you observed it and a callback method. For an immediate threat to life or safety, call 911 instead of using ordinary district contact.'
      }
    };
    if (topic && topics[topic]) {
      const content = topics[topic];
      topicBrief.innerHTML = `<p class="eyebrow">${content.label}</p><h2>${content.title}</h2><p>${content.detail}</p>`;
      topicBrief.hidden = false;
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const playGolfReveal = (scene) => {
    if (!scene || reducedMotion) return;
    scene.classList.add('is-animatable');
    scene.classList.remove('is-playing');
    void scene.offsetWidth;
    scene.classList.add('is-playing');
  };

  document.querySelectorAll('[data-golf-reveal]').forEach((scene) => {
    if (!reducedMotion) scene.classList.add('is-animatable');
  });

  document.querySelectorAll('[data-golf-replay]').forEach((button) => {
    button.addEventListener('click', () => playGolfReveal(button.closest('[data-story-panel]')?.querySelector('[data-golf-reveal]')));
  });
  const revealTargets = [
    ...document.querySelectorAll(
      '.section-intro, .hub-springboard, .service-switchboard > a, .service-card, .action-grid > a, .story-grid > *, .two-column > *, .split-feature > *, .metric-row > *, .contact-directory > article'
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

  const openArchiveTarget = () => {
    const archiveTarget = window.location.hash ? document.querySelector(`.archive-list ${window.location.hash}`) : null;
    if (!(archiveTarget instanceof HTMLDetailsElement)) return;
    archiveTarget.open = true;
    requestAnimationFrame(() => archiveTarget.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }));
  };
  openArchiveTarget();
  window.addEventListener('hashchange', openArchiveTarget);

  document.querySelectorAll('[data-story-deck]').forEach((deck) => {
    const tabs = [...deck.querySelectorAll('[data-story-target]')];
    const panels = [...deck.querySelectorAll('[data-story-panel]')];
    const stage = deck.querySelector('.story-deck-stage');

    const activate = (tab, { focus = false, scroll = false } = {}) => {
      if (!tab) return;
      const target = tab.dataset.storyTarget;
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.classList.toggle('is-active', selected);
        candidate.setAttribute('aria-selected', String(selected));
        candidate.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel) => {
        const selected = panel.id === target;
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
        if (selected) playGolfReveal(panel.querySelector('[data-golf-reveal]'));
      });
      if (stage) {
        stage.classList.remove('is-receiving');
        void stage.offsetWidth;
        stage.classList.add('is-receiving');
      }
      if (focus) tab.focus();
      if (scroll && stage && window.matchMedia('(max-width: 760px)').matches) {
        stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, { scroll: true }));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activate(tabs[nextIndex], { focus: true });
      });
    });

    const requestedPanel = window.location.hash.slice(1);
    const requestedTab = tabs.find((tab) => tab.dataset.storyTarget === requestedPanel);
    activate(requestedTab || tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  });

  const portraitTriggers = [...document.querySelectorAll('[data-member-portrait-trigger]')];
  if (portraitTriggers.length) {
    const setPortraitState = (trigger, open) => {
      const member = trigger.closest('.board-member');
      const portrait = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(open));
      member?.classList.toggle('is-portrait-open', open);
      portrait?.setAttribute('aria-hidden', String(!open));
    };

    const closePortraits = (except = null) => {
      portraitTriggers.forEach((trigger) => {
        if (trigger !== except) setPortraitState(trigger, false);
      });
    };

    portraitTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        closePortraits(trigger);
        setPortraitState(trigger, open);
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.board-member')) closePortraits();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const openTrigger = portraitTriggers.find((trigger) => trigger.getAttribute('aria-expanded') === 'true');
      closePortraits();
      openTrigger?.focus();
    });
  }

  const search = document.querySelector('[data-resource-search]');
  const items = [...document.querySelectorAll('[data-resource-item]')];
  const empty = document.querySelector('[data-resource-empty]');
  const library = document.querySelector('[data-resource-library]');
  const shelves = [...document.querySelectorAll('[data-resource-category]')];
  const resourceHeading = document.querySelector('[data-resource-heading]');
  const resourceCount = document.querySelector('[data-resource-count]');
  if (search && items.length) {
    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    const requestedQuery = new URLSearchParams(window.location.search).get('q');
    let activeCategory = shelves.some((shelf) => shelf.dataset.resourceCategory === requestedCategory)
      ? requestedCategory
      : (library?.dataset.defaultCategory || shelves[0]?.dataset.resourceCategory || 'all');

    const filterResources = () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const matchesQuery = !query || item.dataset.search.includes(query);
        const matchesCategory = query || activeCategory === 'all' || item.dataset.category.split(' ').includes(activeCategory);
        const match = matchesQuery && matchesCategory;
        item.hidden = !match;
        if (match) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (resourceCount) resourceCount.textContent = `${visible} ${visible === 1 ? 'file' : 'files'}`;
      if (resourceHeading && query) resourceHeading.textContent = `Search results for “${search.value.trim()}”`;
    };

    const selectShelf = (shelf) => {
      activeCategory = shelf.dataset.resourceCategory;
      search.value = '';
      shelves.forEach((candidate) => {
        const selected = candidate === shelf;
        candidate.classList.toggle('is-active', selected);
        candidate.setAttribute('aria-pressed', String(selected));
      });
      if (resourceHeading) resourceHeading.textContent = shelf.querySelector('strong')?.textContent || 'Documents';
      const url = new URL(window.location.href);
      url.searchParams.set('category', activeCategory);
      window.history.replaceState({}, '', url);
      filterResources();
    };

    shelves.forEach((shelf) => shelf.addEventListener('click', () => selectShelf(shelf)));
    search.addEventListener('input', filterResources);
    const initialShelf = shelves.find((shelf) => shelf.dataset.resourceCategory === activeCategory);
    if (requestedQuery) {
      search.value = requestedQuery;
      shelves.forEach((shelf) => { shelf.classList.remove('is-active'); shelf.setAttribute('aria-pressed', 'false'); });
      filterResources();
    } else if (initialShelf) selectShelf(initialShelf);
    else filterResources();
  }
})();
