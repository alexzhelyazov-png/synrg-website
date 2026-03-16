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
})();
