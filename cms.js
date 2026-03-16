// ── SYNRG CMS — Dynamic content loader ─────────────────────
// Fetches content from Supabase and replaces hardcoded HTML.
// Falls back gracefully — if Supabase is down, hardcoded content stays.
(function() {
  var CMS_URL = 'https://nzrtdqlgljcipfmectwp.supabase.co/rest/v1';
  var CMS_KEY = 'sb_publishable_Rs2gzY1pSf67S-uq6VpGGA_fQdSgMah';

  function cmsHeaders() {
    return { 'apikey': CMS_KEY, 'Authorization': 'Bearer ' + CMS_KEY };
  }

  window.cmsGet = function(table, params) {
    return fetch(CMS_URL + '/' + table + (params || ''), { headers: cmsHeaders() })
      .then(function(res) { return res.ok ? res.json() : null; })
      .catch(function() { return null; });
  };

  window.cmsLang = function() {
    return localStorage.getItem('synrg-lang') || 'bg';
  };

  window.cmsText = function(item, fieldBase) {
    var lang = cmsLang();
    return item[fieldBase + '_' + lang] || item[fieldBase + '_bg'] || '';
  };

  // Re-apply language after dynamic content is loaded
  window.cmsReapplyLang = function() {
    var lang = cmsLang();
    document.querySelectorAll('[data-bg]').forEach(function(el) {
      var val = el.getAttribute('data-' + lang);
      if (val !== null) el.innerHTML = val;
    });
  };

  // ── Load content blocks from site_content_blocks ──────────
  // Finds elements with data-cms="page.section.key" and replaces their innerHTML
  // Also loads 'shared' blocks (footer, etc.)
  window.cmsLoadContentBlocks = function(pageName) {
    var lang = cmsLang();
    var filter = '?select=*&or=(page.eq.' + pageName + ',page.eq.shared)';

    cmsGet('site_content_blocks', filter).then(function(blocks) {
      if (!blocks || blocks.length === 0) return;

      blocks.forEach(function(b) {
        var key = b.page + '.' + b.section + '.' + b.block_key;
        var val = b['value_' + lang] || b.value_bg || '';
        if (!val) return;

        // Find element by data-cms attribute
        var el = document.querySelector('[data-cms="' + key + '"]');
        if (el) {
          el.innerHTML = val;
          // Also update data-bg and data-en for language switcher
          el.setAttribute('data-bg', b.value_bg || '');
          el.setAttribute('data-en', b.value_en || '');
        }

        // Also try shared blocks with just section.key
        if (b.page === 'shared') {
          var sharedKey = 'shared.' + b.section + '.' + b.block_key;
          document.querySelectorAll('[data-cms="' + sharedKey + '"]').forEach(function(el2) {
            el2.innerHTML = val;
            el2.setAttribute('data-bg', b.value_bg || '');
            el2.setAttribute('data-en', b.value_en || '');
          });
        }
      });
    });
  };
})();
