(() => {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
  }

  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  const tabCopy = {
    'Inspection request': 'Preview the first step for a defensible space or fire prevention inspection request.',
    'Incident report request': 'Preview how a resident could request an available incident report and receive follow-up instructions.',
    'General question': 'Preview a routed non-emergency question for department staff.'
  };

  const tabs = [...document.querySelectorAll('[data-request-tab]')];
  const panel = document.querySelector('#request-panel');
  const formTitle = document.querySelector('[data-form-title]');
  const formCopy = document.querySelector('[data-form-copy]');
  const formStatus = document.querySelector('[data-form-status]');

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      panel?.setAttribute('aria-labelledby', tab.id);
      if (formTitle) formTitle.textContent = tab.dataset.requestType;
      if (formCopy) formCopy.textContent = tabCopy[tab.dataset.requestType];
      if (formStatus) {
        formStatus.hidden = true;
        formStatus.textContent = '';
      }
    });

    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  document.querySelector('[data-concept-form]')?.addEventListener('submit', (event) => event.preventDefault());

  document.querySelector('[data-concept-submit]')?.addEventListener('click', () => {
    const requestType = formTitle?.textContent || 'Request';
    if (!formStatus) return;
    formStatus.hidden = false;
    formStatus.innerHTML = `<strong>${requestType} workflow preview</strong><span>In a production Microsoft 365 workflow, the request would be validated, securely routed to staff, and assigned a reference number. Nothing was submitted or stored.</span>`;
    formStatus.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
})();
