/**
 * Pay For Layers — grid search and tag filtering, plus newsletter states.
 *
 * Everything here is an enhancement. With JavaScript off:
 *   - each tag is an ordinary link to a real, crawlable page in /tags/
 *   - the search field submits as a GET form and simply reloads the page
 *   - the newsletter posts straight to Mailchimp in a new tab, as it always has
 * Nothing below is required for the page to work.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------- filtering */

  var grid = document.getElementById('grid');
  var searchInput = document.getElementById('q');
  var searchForm = document.querySelector('.search-form');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var tagLinks = Array.prototype.slice.call(document.querySelectorAll('.tags a'));

  if (grid && searchInput && countEl) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var total = cards.length;

    // On a tag page the grid only holds that tag's cards, so client-side tag
    // switching would have nothing to switch to. Filter in the page only when
    // every illustration is present — i.e. on the index.
    var isIndex = !/\/tags\//.test(location.pathname);

    var state = { tag: null, q: '' };

    function apply() {
      var q = state.q.trim().toLowerCase();
      var shown = 0;

      cards.forEach(function (card) {
        var okTag = !state.tag || card.dataset.tags.split(' ').indexOf(state.tag) !== -1;
        var okQ = !q || card.dataset.search.indexOf(q) !== -1;
        var show = okTag && okQ;
        card.hidden = !show;
        if (show) shown++;
      });

      countEl.textContent = shown + ' illustration' + (shown === 1 ? '' : 's');
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    // Search is available on every page; it narrows whatever is on it.
    if (searchForm) searchForm.addEventListener('submit', function (e) { e.preventDefault(); });

    searchInput.addEventListener('input', function () {
      state.q = searchInput.value;
      apply();
    });

    // Escape clears the field rather than leaving a filtered grid behind.
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && searchInput.value) {
        searchInput.value = '';
        state.q = '';
        apply();
      }
    });

    if (isIndex) {
      tagLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
          // Let modified clicks open a new tab as normal.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();

          var href = link.getAttribute('href');
          var match = href.match(/tags\/([^.]+)\.html/);
          state.tag = match ? match[1] : null;

          tagLinks.forEach(function (other) {
            if (other === link) other.setAttribute('aria-current', 'true');
            else other.removeAttribute('aria-current');
          });

          apply();
          history.pushState({ tag: state.tag }, '', href);
        });
      });

      window.addEventListener('popstate', function (e) {
        var tag = (e.state && e.state.tag) || null;
        state.tag = tag;
        tagLinks.forEach(function (link) {
          var href = link.getAttribute('href');
          var match = href.match(/tags\/([^.]+)\.html/);
          var slug = match ? match[1] : null;
          if (slug === tag) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
        apply();
      });
    }

    // Reflect ?q= on load so a no-JS search submit lands somewhere sensible.
    var initial = new URLSearchParams(location.search).get('q');
    if (initial) {
      searchInput.value = initial;
      state.q = initial;
      apply();
    }

    void total;
  }

  /* -------------------------------------------------------- newsletter */

  var form = document.getElementById('newsletter-form');
  var status = document.getElementById('newsletter-status');

  if (form && status) {
    var email = form.querySelector('input[type="email"]');
    var submit = form.querySelector('button[type="submit"]');

    function say(message, state) {
      status.textContent = message;
      status.setAttribute('data-state', state);
    }

    form.addEventListener('submit', function (e) {
      var value = email.value.trim();

      if (!value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        e.preventDefault();
        say('That address does not look right. Check it and try again.', 'error');
        email.focus();
        return;
      }

      // Mailchimp's classic endpoint does not allow a cross-origin POST, so the
      // form still submits to its own tab. What we can do honestly is confirm
      // the handoff here rather than claim a subscription we cannot verify.
      say('Opening Mailchimp to confirm your address. Check the new tab.', 'ok');
      submit.disabled = true;
      setTimeout(function () { submit.disabled = false; }, 4000);
    });

    email.addEventListener('input', function () {
      if (status.getAttribute('data-state') === 'error') {
        status.textContent = '';
        status.removeAttribute('data-state');
      }
    });
  }
})();
