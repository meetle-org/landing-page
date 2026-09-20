/* Meetle marketing site — site.js (vanilla, no dependencies, loaded with defer).
   Set LIVE_APP_URL when the app is public: every `.js-primary-cta` becomes
   "Start talking" linking there and every `.js-waitlist-note` is hidden. */
const LIVE_APP_URL = '';

(function () {
  'use strict';
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- Live-app switch ---- */
  if (LIVE_APP_URL) {
    $$('.js-primary-cta').forEach(function (a) { a.textContent = 'Start talking'; a.setAttribute('href', LIVE_APP_URL); });
    $$('.js-waitlist-note').forEach(function (n) { n.hidden = true; });
  }

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    var mq = window.matchMedia('(min-width: 880px)');
    var onChange = function (m) { if (m.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---- Waitlist form(s) ---- */
  var MSG = {
    empty: 'Pop your email in first.',
    invalid: 'That doesn\'t look like an email address — check for a typo?',
    noEndpoint: 'The waitlist isn\'t taking sign-ups right now. Email hello@meetle.org and we\'ll add you by hand.',
    network: 'Couldn\'t reach the waitlist. Check your connection and try again.',
    duplicate: 'You\'re already on the list. Patience, friend.',
    rate: 'Easy — one sign-up is plenty. Try again in a minute.'
  };
  var SUCCESS = '<p><strong>You\'re on the list.</strong> We\'ll email you when it\'s your turn to start talking. Until then, tell a friend — you\'ll want someone to compare notes with.</p>';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  $$('form.js-waitlist').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var hp = form.querySelector('.js-hp');
    var btn = form.querySelector('button[type="submit"]');
    var err = form.querySelector('.js-error');
    if (!input || !btn || !err) return;
    form.noValidate = true; // our messages instead of the browser bubble

    var showError = function (msg) {
      err.textContent = msg; err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    };
    var clearError = function () {
      if (!err.hidden) { err.hidden = true; err.textContent = ''; }
      input.removeAttribute('aria-invalid');
    };
    var succeed = function () {
      var box = document.createElement('div');
      box.className = 'waitlist__success';
      box.setAttribute('role', 'status');
      box.setAttribute('tabindex', '-1');
      box.innerHTML = SUCCESS;
      form.replaceWith(box);
      box.focus();
    };

    input.addEventListener('input', clearError);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (hp && hp.value) { succeed(); return; } // honeypot: pretend, send nothing
      if (!email) { showError(MSG.empty); return; }
      if (!EMAIL_RE.test(email)) { showError(MSG.invalid); return; }
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      if (!endpoint) { showError(MSG.noEndpoint); return; }
      clearError();
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Adding you…';
      var fail = function (msg) { btn.disabled = false; btn.textContent = label; showError(msg); };
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email, source: location.pathname })
      }).then(function (r) {
        if (r.ok) { succeed(); return; }
        fail(r.status === 409 ? MSG.duplicate : r.status === 429 ? MSG.rate : MSG.network);
      }).catch(function () { fail(MSG.network); });
    });
  });
})();
