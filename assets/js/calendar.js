// Villa des Lys — booking calendar (Airbnb sync)
(() => {
  const STRINGS = {
    fr: {
      months: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
      days: ['L','M','M','J','V','S','D'],
      prev: 'Mois précédent',
      next: 'Mois suivant',
      checkin: 'Arrivée',
      checkout: 'Départ',
      pickCheckin: 'Sélectionnez votre date d\'arrivée',
      pickCheckout: 'Sélectionnez votre date de départ',
      unavailable: 'Indisponible',
      legendAvail: 'Disponible',
      legendBlocked: 'Indisponible',
      reset: 'Réinitialiser',
      loadError: 'Calendrier indisponible — appelez-nous au +33 6 03 89 69 40.'
    },
    en: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      days: ['M','T','W','T','F','S','S'],
      prev: 'Previous month',
      next: 'Next month',
      checkin: 'Check-in',
      checkout: 'Check-out',
      pickCheckin: 'Select your check-in date',
      pickCheckout: 'Select your check-out date',
      unavailable: 'Unavailable',
      legendAvail: 'Available',
      legendBlocked: 'Unavailable',
      reset: 'Reset',
      loadError: 'Calendar unavailable — please call us on +33 6 03 89 69 40.'
    }
  };

  const lang = (document.documentElement.lang || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const t = STRINGS[lang];

  // Resolve path to availability.json depending on page depth
  const dataUrl = (() => {
    const depth = window.location.pathname.replace(/\/[^/]*$/, '/').split('/').length - 2;
    const root = location.pathname.includes('/villa-des-lys/') ? '/villa-des-lys/' : '/';
    // Use a relative path from current page
    const segments = location.pathname.split('/').filter(Boolean);
    // If page is en/ or pages/, depth = 1, need ../ ; if root, depth = 0
    const rel = segments.length > 1 ? '../' : '';
    return rel + 'assets/data/availability.json';
  })();

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fmtDisplay = (d) => {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const addMonths = (d, n) => {
    const x = new Date(d);
    x.setDate(1);
    x.setMonth(x.getMonth() + n);
    return x;
  };

  const datesBetween = (start, end) => {
    const list = [];
    const cur = new Date(start);
    while (cur < end) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  };

  let blockedSet = new Set();
  let loaded = false;
  let loadFailed = false;

  const loadData = async () => {
    if (loaded || loadFailed) return;
    try {
      const res = await fetch(dataUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      blockedSet = new Set(data.blocked || []);
      loaded = true;
    } catch (e) {
      loadFailed = true;
      console.warn('availability.json fetch failed:', e);
    }
  };

  const initCalendar = (root, opts) => {
    const today = startOfDay(new Date());
    let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let checkin = null;
    let checkout = null;

    root.innerHTML = `
      <div class="vdl-cal__head">
        <button type="button" class="vdl-cal__nav" data-cal-prev aria-label="${t.prev}">‹</button>
        <span class="vdl-cal__month" data-cal-month></span>
        <button type="button" class="vdl-cal__nav" data-cal-next aria-label="${t.next}">›</button>
      </div>
      <div class="vdl-cal__weekdays">
        ${t.days.map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="vdl-cal__grid" data-cal-grid role="grid"></div>
      <div class="vdl-cal__hint" data-cal-hint>${t.pickCheckin}</div>
      <div class="vdl-cal__legend">
        <span><i class="vdl-cal__sw vdl-cal__sw--avail"></i>${t.legendAvail}</span>
        <span><i class="vdl-cal__sw vdl-cal__sw--blocked"></i>${t.legendBlocked}</span>
        <button type="button" class="vdl-cal__reset" data-cal-reset>${t.reset}</button>
      </div>
    `;

    const grid = root.querySelector('[data-cal-grid]');
    const monthLabel = root.querySelector('[data-cal-month]');
    const hint = root.querySelector('[data-cal-hint]');
    const inputIn = opts.inputIn;
    const inputOut = opts.inputOut;

    const isBlocked = (d) => blockedSet.has(fmt(d));
    const isPast = (d) => d < today;

    const rangeContainsBlocked = (a, b) => {
      const start = a < b ? a : b;
      const end = a < b ? b : a;
      const cur = new Date(start);
      cur.setDate(cur.getDate() + 1);
      while (cur < end) {
        if (isBlocked(cur)) return true;
        cur.setDate(cur.getDate() + 1);
      }
      return false;
    };

    const setInputs = () => {
      if (inputIn) inputIn.value = checkin ? fmt(checkin) : '';
      if (inputOut) inputOut.value = checkout ? fmt(checkout) : '';
    };

    const updateHint = () => {
      if (loadFailed) {
        hint.textContent = t.loadError;
        return;
      }
      if (!checkin) hint.textContent = t.pickCheckin;
      else if (!checkout) hint.textContent = t.pickCheckout;
      else hint.textContent = `${t.checkin}: ${fmtDisplay(checkin)} · ${t.checkout}: ${fmtDisplay(checkout)}`;
    };

    const render = () => {
      monthLabel.textContent = `${t.months[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
      const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      // Monday = 0, Sunday = 6
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push('<span class="vdl-cal__cell vdl-cal__cell--empty"></span>');
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        const past = isPast(d);
        const blocked = isBlocked(d);
        const inRange = checkin && checkout && d > checkin && d < checkout;
        const isCheckin = checkin && d.getTime() === checkin.getTime();
        const isCheckout = checkout && d.getTime() === checkout.getTime();
        const cls = ['vdl-cal__cell'];
        if (past) cls.push('vdl-cal__cell--past');
        if (blocked && !past) cls.push('vdl-cal__cell--blocked');
        if (!past && !blocked) cls.push('vdl-cal__cell--avail');
        if (isCheckin) cls.push('vdl-cal__cell--checkin');
        if (isCheckout) cls.push('vdl-cal__cell--checkout');
        if (inRange) cls.push('vdl-cal__cell--inrange');
        const disabled = past || blocked;
        const aria = disabled ? `aria-disabled="true" title="${t.unavailable}"` : '';
        cells.push(`<button type="button" class="${cls.join(' ')}" data-day="${fmt(d)}" ${aria} ${disabled ? 'tabindex="-1"' : ''}>${day}</button>`);
      }
      grid.innerHTML = cells.join('');
      updateHint();
    };

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-day]');
      if (!btn || btn.classList.contains('vdl-cal__cell--past') || btn.classList.contains('vdl-cal__cell--blocked')) return;
      const [y, m, d] = btn.dataset.day.split('-').map(Number);
      const picked = new Date(y, m - 1, d);

      if (!checkin || (checkin && checkout)) {
        checkin = picked;
        checkout = null;
      } else if (picked <= checkin) {
        checkin = picked;
        checkout = null;
      } else {
        if (rangeContainsBlocked(checkin, picked)) {
          checkin = picked;
          checkout = null;
        } else {
          checkout = picked;
        }
      }
      setInputs();
      render();
    });

    root.querySelector('[data-cal-prev]').addEventListener('click', () => {
      const candidate = addMonths(viewMonth, -1);
      // Ne pas reculer avant le mois courant
      const monthFloor = new Date(today.getFullYear(), today.getMonth(), 1);
      if (candidate >= monthFloor) {
        viewMonth = candidate;
        render();
      }
    });
    root.querySelector('[data-cal-next]').addEventListener('click', () => {
      viewMonth = addMonths(viewMonth, 1);
      render();
    });
    root.querySelector('[data-cal-reset]').addEventListener('click', () => {
      checkin = null;
      checkout = null;
      setInputs();
      render();
    });

    render();
  };

  const mountAll = async () => {
    const targets = document.querySelectorAll('[data-vdl-calendar]');
    if (!targets.length) return;
    await loadData();
    targets.forEach((root) => {
      if (root.dataset.calMounted === '1') return;
      root.dataset.calMounted = '1';
      const inputIn = document.getElementById(root.dataset.inputIn || 'modal-arrivee');
      const inputOut = document.getElementById(root.dataset.inputOut || 'modal-depart');
      initCalendar(root, { inputIn, inputOut });
    });
  };

  // Mount on load + re-mount when booking modal opens
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }

  // Hook into booking modal open
  const observer = new MutationObserver(() => {
    const modal = document.getElementById('booking-modal');
    if (modal && modal.classList.contains('is-open')) mountAll();
  });
  const target = document.getElementById('booking-modal');
  if (target) observer.observe(target, { attributes: true, attributeFilter: ['class'] });
})();
