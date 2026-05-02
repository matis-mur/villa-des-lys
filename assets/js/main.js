// Villa des Lys — interactions
(() => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky header on scroll
  const onScroll = () => {
    if (!header) return;
    const scrolled = window.scrollY > 60;
    header.classList.toggle('is-scrolled', scrolled);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // Right-side scroll dots: click to scroll, auto-track active section
  const dots = document.querySelectorAll('.scroll-dots__dot');
  if (dots.length) {
    const targets = Array.from(dots).map((d) => {
      const id = d.dataset.target;
      return id ? document.getElementById(id) : null;
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        const t = targets[i];
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = targets.indexOf(entry.target);
            if (idx !== -1) {
              dots.forEach((d) => d.classList.remove('is-active'));
              dots[idx].classList.add('is-active');
            }
          }
        });
      }, { threshold: 0.4 });
      targets.forEach((t) => t && io2.observe(t));
    }
  }

  // Active nav based on file name
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a, .mobile-menu a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(path)) a.classList.add('is-active');
  });

  // Booking modal
  const bookingModal = document.getElementById('booking-modal');

  const openBookingModal = () => {
    if (!bookingModal) return;
    bookingModal.classList.add('is-open');
    bookingModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus the first input
    const firstInput = bookingModal.querySelector('input, select, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  };

  const closeBookingModal = () => {
    if (!bookingModal) return;
    bookingModal.classList.remove('is-open');
    bookingModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Click handler for opening/closing modal
  document.addEventListener('click', (e) => {
    // Open: any element with [data-open-booking] OR href ending with #reserver
    const opener = e.target.closest('[data-open-booking], a[href$="#reserver"]');
    if (opener && bookingModal) {
      e.preventDefault();
      openBookingModal();
      // Close mobile menu if it was open
      if (mobileMenu && mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        if (menuToggle) {
          menuToggle.classList.remove('is-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      }
      return;
    }
    // Close: anything with [data-close-booking]
    if (e.target.closest('[data-close-booking]')) {
      closeBookingModal();
    }
  });

  // ESC key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal && bookingModal.classList.contains('is-open')) {
      closeBookingModal();
    }
  });
})();
