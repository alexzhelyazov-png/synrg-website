// ── SYNRG Cart System ──────────────────────────────────────
// Shared across all pages. Manages cart state, drawer UI, and Stripe checkout.

const CART_KEY = 'synrg-cart';
// TODO: Replace with your Supabase Edge Function URL after deployment
const CHECKOUT_URL = 'https://nzrtdqlgljcipfmectwp.supabase.co/functions/v1/create-checkout-session';

// ── Cart state helpers ─────────────────────────────────────

function getCart() {
  let cart;
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { cart = []; }
  // Filter out corrupted entries (e.g. from older buggy addToCart calls
  // that passed object instead of positional args). A valid item must have
  // a string priceId, a numeric price, and at least one name field.
  const valid = cart.filter(item =>
    item &&
    typeof item.priceId === 'string' &&
    typeof item.price === 'number' && !isNaN(item.price) &&
    (typeof item.name_bg === 'string' || typeof item.name_en === 'string')
  );
  if (valid.length !== cart.length) {
    localStorage.setItem(CART_KEY, JSON.stringify(valid));
  }
  return valid;
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderCartItems();
}

function addToCart(priceId, nameBg, nameEn, price, currency, programId) {
  const cart = getCart();
  const existing = cart.find(item => item.priceId === priceId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ priceId, name_bg: nameBg, name_en: nameEn, price: price, currency: currency, quantity: 1, program_id: programId || null });
  }
  saveCart(cart);
  openCartDrawer();
  // Meta Pixel: AddToCart (gated by marketing consent inside meta-pixel.js)
  if (window.synrgPixel) {
    window.synrgPixel.track('AddToCart', {
      content_ids: [programId || priceId],
      content_name: nameBg || nameEn,
      content_type: 'product',
      value: (price || 0) / 100,
      currency: currency || 'EUR',
    });
  }
}

function removeFromCart(priceId) {
  const cart = getCart().filter(item => item.priceId !== priceId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  renderCartItems();
}

function getCartTotal() {
  return getCart().reduce(function (sum, item) { return sum + (item.price * item.quantity); }, 0);
}

function getCartCount() {
  return getCart().reduce(function (sum, item) { return sum + item.quantity; }, 0);
}

// ── Badge ──────────────────────────────────────────────────

function updateCartBadge() {
  var badges = document.querySelectorAll('.cart-badge');
  var count = getCartCount();
  badges.forEach(function (badge) {
    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
  });
}

// ── Drawer HTML injection ──────────────────────────────────

function injectCartDrawer() {
  if (document.getElementById('cartDrawer')) return; // already injected

  var html =
    '<div class="cart-overlay" id="cartOverlay"></div>' +
    '<div class="cart-drawer" id="cartDrawer">' +
      '<div class="cart-header">' +
        '<h3 data-bg="Кошница" data-en="Cart">Кошница</h3>' +
        '<button class="cart-close" id="cartCloseBtn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="cart-items" id="cartItems"></div>' +
      '<div class="cart-footer" id="cartFooter">' +
        '<div class="cart-total">' +
          '<span data-bg="Общо" data-en="Total">Общо</span>' +
          '<span id="cartTotalAmount"></span>' +
        '</div>' +
        '<label class="cart-consent" for="cartConsent" style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#9aa39a;margin-bottom:12px;line-height:1.5;cursor:pointer;">' +
          '<input type="checkbox" id="cartConsent" style="margin-top:3px;flex:0 0 auto;accent-color:#c4e9bf;" />' +
          '<span>' +
            '<span data-bg="Прочетох и приемам " data-en="I have read and accept the ">Прочетох и приемам </span>' +
            '<a href="terms.html" target="_blank" rel="noopener" style="color:#c4e9bf;text-decoration:underline;" data-bg="Общи условия" data-en="Terms of Service">Общи условия</a>' +
            '<span data-bg=" и " data-en=" and "> и </span>' +
            '<a href="privacy.html" target="_blank" rel="noopener" style="color:#c4e9bf;text-decoration:underline;" data-bg="Политика за поверителност" data-en="Privacy Policy">Политика за поверителност</a>' +
            '<span data-bg=". Цените са в евро. Синерджи 93 ООД не е регистрирано по ЗДДС." data-en=". Prices are in EUR. Sinerji 93 Ltd is not VAT-registered.">. Цените са в евро. Синерджи 93 ООД не е регистрирано по ЗДДС.</span>' +
          '</span>' +
        '</label>' +
        '<button class="cart-checkout-btn" id="cartCheckoutBtn" ' +
          'data-bg="Към плащане →" data-en="Proceed to payment →">' +
          'Към плащане →' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', html);

  // Event listeners
  document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCartDrawer);
  document.getElementById('cartCheckoutBtn').addEventListener('click', handleCheckout);

  // Event delegation for remove buttons (survives innerHTML rebuilds)
  document.getElementById('cartItems').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove]');
    if (btn) removeFromCart(btn.getAttribute('data-remove'));
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCartDrawer();
  });
}

// ── Drawer open / close ────────────────────────────────────

function openCartDrawer() {
  var overlay = document.getElementById('cartOverlay');
  var drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.add('open');
  if (drawer) drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartItems();
}

function closeCartDrawer() {
  var overlay = document.getElementById('cartOverlay');
  var drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleCartDrawer() {
  var drawer = document.getElementById('cartDrawer');
  if (drawer && drawer.classList.contains('open')) {
    closeCartDrawer();
  } else {
    openCartDrawer();
  }
}

// ── Render cart items ──────────────────────────────────────

function renderCartItems() {
  var container = document.getElementById('cartItems');
  var footer = document.getElementById('cartFooter');
  var totalEl = document.getElementById('cartTotalAmount');
  if (!container) return;

  var cart = getCart();
  var lang = localStorage.getItem('synrg-lang') || 'bg';

  if (cart.length === 0) {
    container.innerHTML =
      '<div class="cart-empty" data-bg="Кошницата е празна" data-en="Your cart is empty">' +
        (lang === 'en' ? 'Your cart is empty' : 'Кошницата е празна') +
      '</div>';
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = '';

  container.innerHTML = cart.map(function (item) {
    var name = lang === 'en' ? item.name_en : item.name_bg;
    var priceDisplay = formatPrice(item.price, item.currency);
    var removeLabel = lang === 'en' ? 'Remove' : 'Премахни';
    return (
      '<div class="cart-item">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + name + '</div>' +
          '<div class="cart-item-price">' +
            (item.quantity > 1 ? item.quantity + ' x ' : '') + priceDisplay +
          '</div>' +
          '<button class="cart-item-remove" data-remove="' + item.priceId + '">' +
            removeLabel +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  // Remove listeners are handled via event delegation on the container

  if (totalEl) {
    var total = getCartTotal();
    var currency = cart[0] ? cart[0].currency : 'BGN';
    totalEl.textContent = formatPrice(total, currency);
  }
}

function formatPrice(amountInCents, currency) {
  var amount = (amountInCents / 100).toFixed(2);
  // Remove trailing .00
  if (amount.endsWith('.00')) amount = amount.slice(0, -3);
  if (currency === 'BGN') return amount + ' лв';
  if (currency === 'EUR') return '€' + amount;
  return amount + ' ' + currency;
}

// ── Add-to-cart button handlers ────────────────────────────

function setupAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('[data-price-id]');
      if (!card) return;
      var priceId = card.getAttribute('data-price-id');
      var nameBg = card.getAttribute('data-product-bg');
      var nameEn = card.getAttribute('data-product-en');
      var price = parseInt(card.getAttribute('data-price'), 10);
      var currency = card.getAttribute('data-currency') || 'BGN';
      var programId = card.getAttribute('data-program-id') || null;
      if (!priceId || isNaN(price)) return;
      addToCart(priceId, nameBg, nameEn, price, currency, programId);

      // Visual feedback
      var origText = btn.textContent;
      btn.textContent = '✓';
      btn.disabled = true;
      setTimeout(function () {
        btn.disabled = false;
        var lang = localStorage.getItem('synrg-lang') || 'bg';
        btn.textContent = lang === 'en'
          ? (btn.getAttribute('data-en') || origText)
          : (btn.getAttribute('data-bg') || origText);
      }, 800);
    });
  });
}

// ── Checkout ───────────────────────────────────────────────

async function handleCheckout() {
  var cart = getCart();
  if (cart.length === 0) return;

  var lang = localStorage.getItem('synrg-lang') || 'bg';

  // Block checkout if any item still has a placeholder price
  var hasPlaceholder = cart.some(function (item) { return !item.priceId || item.priceId.indexOf('PLACEHOLDER') !== -1; });
  if (hasPlaceholder) {
    alert(lang === 'en'
      ? 'This product is not available for purchase yet. Coming soon!'
      : 'Този продукт все още не е наличен за покупка. Очаквайте скоро!');
    return;
  }

  // Block checkout if consent (T&C + Privacy) is not accepted — required for legal sale
  var consent = document.getElementById('cartConsent');
  if (consent && !consent.checked) {
    alert(lang === 'en'
      ? 'Please accept the Terms of Service and Privacy Policy to continue.'
      : 'Моля приеми Общите условия и Политиката за поверителност, за да продължиш.');
    consent.focus();
    return;
  }

  var btn = document.getElementById('cartCheckoutBtn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  // Meta Pixel: InitiateCheckout
  if (window.synrgPixel) {
    var totalCents = cart.reduce(function (s, it) { return s + (it.price || 0) * (it.quantity || 1); }, 0);
    window.synrgPixel.track('InitiateCheckout', {
      content_ids: cart.map(function (it) { return it.program_id || it.priceId; }),
      num_items: cart.reduce(function (s, it) { return s + (it.quantity || 1); }, 0),
      value: totalCents / 100,
      currency: cart[0] && cart[0].currency || 'EUR',
    });
  }

  var items = cart.map(function (item) {
    return { price: item.priceId, quantity: item.quantity };
  });

  // Identify the buyer: client_id passed from app via URL (?client_id=xxx)
  var clientId = sessionStorage.getItem('synrg_client_id') || '';
  var programId = (cart[0] && cart[0].program_id) ? cart[0].program_id : '';

  var origin = window.location.origin;
  var basePath = window.location.pathname.replace(/\/[^/]*$/, '');

  try {
    var res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_items: items,
        locale: lang === 'bg' ? 'bg' : 'en',
        success_url: origin + basePath + '/remote.html?checkout=success',
        cancel_url: origin + basePath + '/remote.html?checkout=cancel',
        metadata: { client_id: clientId, program_id: programId },
      }),
    });
    var data = await res.json();
    if (data.url) {
      // Snapshot cart so Purchase event on /remote.html?checkout=success has accurate data
      try { sessionStorage.setItem('synrg_pre_checkout_cart', JSON.stringify(cart)); } catch (e) {}
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    var errorMsg = lang === 'en'
      ? 'Something went wrong. Please try again.'
      : 'Нещо се обърка. Опитай отново.';
    alert(errorMsg);
    if (btn) {
      btn.disabled = false;
      btn.textContent = lang === 'en' ? 'Proceed to payment →' : 'Към плащане →';
    }
  }
}

// ── Success / cancel URL handling ──────────────────────────

function handleCheckoutReturn() {
  var params = new URLSearchParams(window.location.search);
  var status = params.get('checkout');
  if (!status) return;

  if (status === 'success') {
    // Meta Pixel: Purchase event (browser-side; CAPI server-side later)
    // Read pre-checkout snapshot of cart for accurate value/contents
    var preCheckoutCart = [];
    try { preCheckoutCart = JSON.parse(sessionStorage.getItem('synrg_pre_checkout_cart') || '[]'); } catch (e) {}
    if (window.synrgPixel) {
      var totalCents = preCheckoutCart.reduce(function (s, it) { return s + (it.price || 0) * (it.quantity || 1); }, 0);
      window.synrgPixel.track('Purchase', {
        content_ids: preCheckoutCart.map(function (it) { return it.program_id || it.priceId; }),
        content_type: 'product',
        num_items: preCheckoutCart.reduce(function (s, it) { return s + (it.quantity || 1); }, 0),
        value: totalCents / 100 || 98,
        currency: (preCheckoutCart[0] && preCheckoutCart[0].currency) || 'EUR',
      });
    }
    sessionStorage.removeItem('synrg_pre_checkout_cart');

    clearCart();
    sessionStorage.removeItem('synrg_client_id');
    var lang = localStorage.getItem('synrg-lang') || 'bg';
    var msg = lang === 'en'
      ? 'Payment successful! Open the app to access your program.'
      : 'Плащането е успешно! Отвори приложението за достъп до програмата.';
    var target = document.getElementById('remote-products') || document.querySelector('main');
    if (target) {
      var banner = document.createElement('div');
      banner.className = 'checkout-success-banner';
      banner.textContent = msg;
      target.parentNode.insertBefore(banner, target);
    }
  }

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  // Save client_id from URL if coming from app (?client_id=xxx)
  var urlClientId = new URLSearchParams(window.location.search).get('client_id');
  if (urlClientId) sessionStorage.setItem('synrg_client_id', urlClientId);

  injectCartDrawer();
  updateCartBadge();
  setupAddToCartButtons();
  handleCheckoutReturn();

  // Re-apply language to newly injected drawer elements
  var lang = localStorage.getItem('synrg-lang') || 'bg';
  if (typeof setLang === 'function') setLang(lang);
});
