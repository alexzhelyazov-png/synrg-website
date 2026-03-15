// ── SYNRG Cart System ──────────────────────────────────────
// Shared across all pages. Manages cart state, drawer UI, and Stripe checkout.

const CART_KEY = 'synrg-cart';
// TODO: Replace with your Supabase Edge Function URL after deployment
const CHECKOUT_URL = 'https://nzrtdqlgljcipfmectwp.supabase.co/functions/v1/create-checkout-session';

// ── Cart state helpers ─────────────────────────────────────

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderCartItems();
}

function addToCart(priceId, nameBg, nameEn, price, currency) {
  const cart = getCart();
  const existing = cart.find(item => item.priceId === priceId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ priceId, name_bg: nameBg, name_en: nameEn, price: price, currency: currency, quantity: 1 });
  }
  saveCart(cart);
  openCartDrawer();
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

  // Attach remove listeners
  container.querySelectorAll('[data-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      removeFromCart(btn.getAttribute('data-remove'));
    });
  });

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
      if (!priceId || isNaN(price)) return;
      addToCart(priceId, nameBg, nameEn, price, currency);

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

  var btn = document.getElementById('cartCheckoutBtn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  var lang = localStorage.getItem('synrg-lang') || 'bg';
  var items = cart.map(function (item) {
    return { price: item.priceId, quantity: item.quantity };
  });

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
      }),
    });
    var data = await res.json();
    if (data.url) {
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
    clearCart();
    var lang = localStorage.getItem('synrg-lang') || 'bg';
    var msg = lang === 'en'
      ? 'Payment successful! You will receive access details by email.'
      : 'Плащането е успешно! Ще получиш достъп по имейл.';
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
  injectCartDrawer();
  updateCartBadge();
  setupAddToCartButtons();
  handleCheckoutReturn();

  // Re-apply language to newly injected drawer elements
  var lang = localStorage.getItem('synrg-lang') || 'bg';
  if (typeof setLang === 'function') setLang(lang);
});
