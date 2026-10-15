/**
 * ====================================================================
 * APPLICATION LOGIC (APP.JS) - TIỆM IN 3D XINH (5 REFINEMENTS)
 * ====================================================================
 * Pure vanilla JavaScript. Static, responsive, no dependencies.
 * Includes:
 * - Single hero search integration
 * - Quick category chips
 * - Auto-scrolling infinite gallery interaction
 * - Shopee-style Product Detail Bottom Sheet (Swipeable gallery, thumbnails,
 *   collapsible description accordion, instant variant price update)
 * ====================================================================
 */

(function () {
  'use strict';

  // 1. APPLICATION STATE
  const state = {
    newOnly: false,             // v24: lọc "Sản phẩm mới"
    selectedCategory: 'all',
    selectedPriceRange: 'all',
    sortBy: 'newest',
    activeProduct: null,
    selectedVariantIndex: 0,
    selectedOptions: {},       // v9: { "Màu sắc": "Xanh Dương", "Loại đèn": "7 màu" }
    zaloSheet: null,           // v10: { message, url } đang hiện trong bảng Zalo
    activeGalleryIndex: 0,
    isDescExpanded: false,
    // v23: Băng chuyền ảnh thật kiểu filmstrip (3s auto-advance, kéo thả)
    filmN: 0,
    swipeAutoTimer: null,
    swipeResumeTimer: null,

    // Fullscreen Lightbox state
    lightboxImages: [],
    lightboxIndex: 0,

    // Product data source: local products.js (mặc định) hoặc Supabase (nếu đã cấu hình)
    products: [],

    // Nội dung web chỉnh trong tab "Cài đặt" / "Ảnh thật" của trang admin
    settings: {},
    gallery: []
  };

  /**
   * Đọc 1 cài đặt: ưu tiên database (tab Cài đặt), rồi đến config.js, rồi giá trị mặc định
   */
  function getSetting(key, fallback) {
    if (state.settings && state.settings[key] != null && state.settings[key] !== '') {
      return state.settings[key];
    }
    return fallback;
  }
  function getShopName() {
    return getSetting('shop_name', (window.CONFIG && window.CONFIG.SHOP_NAME) || 'Tiệm In Flop');
  }
  function getZaloNumber() {
    return getSetting('zalo_number', (window.CONFIG && window.CONFIG.ZALO_NUMBER) || '0123456789');
  }
  function getZaloTemplate() {
    return getSetting('zalo_message_template',
      (window.CONFIG && window.CONFIG.ZALO_MESSAGE_TEMPLATE) ||
      'Chào shop, mình muốn mua {product_name} - {variant_name} - {price}');
  }

  /**
   * Lấy danh sách sản phẩm đang dùng (từ Supabase nếu có, ngược lại từ products.js)
   */
  function getProducts() {
    return state.products && state.products.length ? state.products : [];
  }

  /**
   * Chuyển 1 dòng products (Supabase) về đúng định dạng web đang dùng
   */
  function mapSupabaseRow(row) {
    const variants = (row.product_variants || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(v => ({ name: v.name, price: Number(v.price) || 0, stock: Number(v.stock) || 0 }));
    // v9: nhóm phân loại kiểu Shopee (kèm giá trị), sắp xếp theo sort_order
    // v15: mỗi giá trị có thêm image_url (ảnh thật của phân loại, không bắt buộc)
    const vgroups = (row.variant_groups || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(g => ({
        id: g.id,
        name: g.name,
        values: ((g.variant_values || [])
          .slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(v => ({ value: v.value, image_url: v.image_url || '' }))
          .filter(o => o.value))
      }))
      .filter(g => g.values.length > 0);
    const images = Array.isArray(row.images) && row.images.length ? row.images
      : (row.image ? [row.image] : []);
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description || '',
      image: row.image || (images[0] || ''),
      images: images,
      variants: variants.length ? variants : [{ name: 'Mặc định', price: 0, stock: 0 }],
      vgroups: vgroups,   // [] = dùng kiểu cũ (pills phẳng)
      isNew: !!row.is_new,
      isFeatured: !!row.is_featured,
      // v22: tag tùy chỉnh { text, fg, bg, bg2 } (text trống = không hiện)
      customTag: (row.tag_text || '').trim() ? {
        text: row.tag_text.trim(),
        fg: row.tag_text_color || '#FFFFFF',
        bg: row.tag_bg_color || '#EC4899',
        bg2: row.tag_bg_color2 || ''
      } : null
    };
  }

  // v22: kiểm tra mã màu hex hợp lệ trước khi đưa vào inline style
  function isHex(c) { return /^#[0-9a-fA-F]{6}$/.test(c || ''); }
  // v22: HTML tag tùy chỉnh (đơn sắc hoặc gradient), dùng chung hiệu ứng nhấp nháy
  function customTagHtml(product) {
    const t = product.customTag;
    if (!t) return '';
    const fg = isHex(t.fg) ? t.fg : '#FFFFFF';
    const bg = isHex(t.bg) ? t.bg : '#EC4899';
    const style = isHex(t.bg2)
      ? `color:${fg};background:linear-gradient(135deg,${bg},${t.bg2})`
      : `color:${fg};background:${bg}`;
    const txt = String(t.text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Có tag "Nổi bật" thì tag tùy chỉnh xếp bên dưới
    const cls = product.isFeatured ? 'card-custom-tag below-featured' : 'card-custom-tag';
    return `<span class="${cls}" style="${style}">${txt}</span>`;
  }

  /**
   * v9: tên SKU từ các giá trị đang chọn, vd "Xanh Dương, 7 màu".
   * Trả về variant khớp, hoặc null.
   */
  function findSkuBySelection(product, selectedValues) {
    if (!product.vgroups || !product.vgroups.length) return null;
    const skuName = product.vgroups.map(g => selectedValues[g.name] || '').join(', ');
    return product.variants.find(v => v.name === skuName) || null;
  }

  /**
   * v23c: cache chữ cài đặt vào máy khách để lần sau mở web hiện chữ của shop
   * ngay lập tức, không chớp chữ mặc định 1-2 giây chờ mạng.
   */
  var SETTINGS_CACHE_KEY = 'tif_settings_v1';
  function saveSettingsCache(settings) {
    try {
      if (settings && Object.keys(settings).length) {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
      }
    } catch (e) { /* bộ nhớ đầy / chế độ riêng tư: bỏ qua */ }
  }
  function readSettingsCache() {
    try {
      const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      return (obj && typeof obj === 'object') ? obj : null;
    } catch (e) { return null; }
  }

  /**
   * Tải nội dung web (cài đặt + ảnh thật) từ Supabase.
   * Trả về { settings: {}, gallery: [] } khi chưa cấu hình hoặc lỗi.
   */
  async function loadSiteContent() {
    const empty = { settings: {}, gallery: [] };
    const cfg = window.CONFIG || {};
    if (!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase)) return empty;
    try {
      const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 7000));
      const [sRes, gRes] = await Promise.race([
        Promise.all([
          client.from('site_settings').select('key, value'),
          client.from('site_gallery').select('image_url').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
        ]),
        timeout
      ]);
      const settings = {};
      if (!sRes.error && sRes.data) {
        sRes.data.forEach(row => { settings[row.key] = row.value; });
      }
      const gallery = (!gRes.error && gRes.data) ? gRes.data.map(r => r.image_url).filter(Boolean) : [];
      saveSettingsCache(settings); // v23c: lưu để lần sau hiện ngay
      return { settings, gallery };
    } catch (e) {
      console.warn('[Supabase] Không tải được nội dung web:', e && e.message);
      return empty;
    }
  }

  /**
   * Ticker quảng cáo ở badge hero: mỗi câu hiện 4s rồi trượt lên, lặp lại.
   * Các câu lấy từ cài đặt "hero_badge_text", mỗi dòng một câu.
   */
  let badgeTickerTimer = null;
  function initBadgeTicker(raw) {
    const el = document.getElementById('hero-badge-text');
    if (!el) return;
    if (badgeTickerTimer) { clearInterval(badgeTickerTimer); badgeTickerTimer = null; }
    const messages = String(raw || '').split('\n').map(t => t.trim()).filter(Boolean);
    if (!messages.length) messages.push('Mới: nhận in móc khóa theo tên riêng & màu sắc tùy chọn!');
    // Marquee ngang phải->trái: nối các câu, lặp 2 lần để chạy liền mạch
    const sep = '   \u2726   ';
    const seq = messages.join(sep) + sep;
    el.classList.remove('ticker-out', 'ticker-pre');
    el.classList.add('marquee-track');
    el.innerHTML = '';
    const half = document.createElement('span');
    half.className = 'marquee-half';
    half.textContent = seq;
    el.appendChild(half);
    el.appendChild(half.cloneNode(true));
    // Tốc độ đọc ~55px/giây, tối thiểu 6 giây/vòng
    const setDuration = () => {
      const w = half.offsetWidth || 400;
      el.style.animationDuration = Math.max(6, w / 55) + 's';
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setDuration);
    requestAnimationFrame(setDuration);
  }

  /**
   * Áp các chữ chỉnh trong admin lên giao diện.
   * skipCount = true: bỏ qua đếm "Mẫu hiện có" (dùng khi áp cache sớm, chưa có products).
   */
  function applySettings(skipCount) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el && value != null && value !== '') el.textContent = value;
    };
    set('hero-badge-tag-text', getSetting('hero_badge_tag'));
    set('freeship-text', getSetting('freeship_text', 'Freeship đơn từ 150k'));
    set('hero-card-title', getSetting('hero_card_title', 'Móc khóa & decor in 3D xinh'));
    initBadgeTicker(getSetting('hero_badge_text'));
    set('hero-headline', getSetting('hero_headline'));
    set('hero-subheadline', getSetting('hero_subheadline'));
    set('promo-heading', getSetting('promo_title'));
    set('promo-subtext', getSetting('promo_desc'));
    set('promo-button-text', getSetting('promo_button'));

    const shopName = getShopName();
    elements.shopNameElements.forEach(el => { el.textContent = shopName; });
    document.title = shopName;

    // Số "Mẫu hiện có" tự đếm theo sản phẩm trong database
    if (!skipCount) {
      const countEl = document.getElementById('hero-stat-count');
      if (countEl) {
        const n = getProducts().length;
        countEl.textContent = n > 0 ? `${n}+` : '0';
      }
    }
  }

  /**
   * v24: Bỏ renderQuickChips — đã bỏ ô tìm kiếm + hàng Gợi ý.
   */

  /**
   * v23: Render băng chuyền "Ảnh thật sản phẩm đã in" kiểu filmstrip —
   * 1 tấm chính + 2 tấm phụ mờ kính, lướt ngang, không chấm đếm.
   * Chưa có ảnh nào thì ẩn cả section cho gọn.
   */
  var FILM_CLONES = 2; // số slide clone mỗi đầu để vòng lặp liền mạch
  function renderGallery() {
    const section = document.getElementById('gallery-section');
    const track = document.getElementById('swipe-cards-track');
    if (!track) return;
    const images = state.gallery || [];
    if (!images.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';
    track.innerHTML = '';
    const N = images.length;
    const makeSlide = (i) => {
      const slide = document.createElement('div');
      slide.className = 'fslide';
      slide.setAttribute('data-i', i);
      slide.innerHTML = `
        <div class="fphoton">
          <img src="${images[i]}" alt="Ảnh thật ${i + 1}" class="fphoton-img" loading="lazy" />
          <div class="fglass"></div>
          <button type="button" class="swipe-card-zoom-btn" aria-label="Phóng to ảnh">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
        </div>`;
      return slide;
    };
    // Clone 2 đầu để vòng lặp vô hạn liền mạch
    for (let k = FILM_CLONES; k > 0; k--) track.appendChild(makeSlide((N - k) % N));
    for (let i = 0; i < N; i++) track.appendChild(makeSlide(i));
    for (let k = 0; k < FILM_CLONES; k++) track.appendChild(makeSlide(k % N));
    state.filmN = N;
    elements.swipeCards = track.querySelectorAll('.fslide');
  }

  /**
   * Tải sản phẩm: ưu tiên Supabase (nếu đã điền key trong config.js),
   * lỗi/timeout hoặc chưa cấu hình thì dùng dữ liệu mẫu trong products.js.
   * Lưu ý: khi Supabase đã cấu hình và truy vấn THÀNH CÔNG thì dữ liệu
   * trong database là nguồn chính (kể cả khi bảng đang trống).
   */
  async function loadProductsFromSource() {
    const cfg = window.CONFIG || {};
    const local = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      try {
        const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const query = client
          .from('products')
          .select('*, product_variants(*), variant_groups(*, variant_values(*))')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout quá 7 giây')), 7000));
        const { data, error } = await Promise.race([query, timeout]);
        if (error) throw new Error(error.message);
        const mapped = (data || []).map(mapSupabaseRow);
        // Sản phẩm được ghim "Nổi bật" luôn đứng đầu danh sách
        mapped.sort((a, b) => ((b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)));
        return mapped;
      } catch (e) {
        console.warn('[Supabase] Không tải được sản phẩm, dùng dữ liệu mẫu:', e && e.message);
      }
    }
    return local;
  }

  // 2. DOM ELEMENT REFERENCES
  const elements = {
    shopNameElements: document.querySelectorAll('[data-bind="shop-name"]'),
    
    // Hero Elements
    newFilterBtn: document.getElementById('new-filter-btn'),

    // Swipe Cards Elements
    swipeCardsWrap: document.getElementById('swipe-cards-wrap'),
    swipeCardsViewport: document.getElementById('swipe-cards-viewport'),
    swipeCardsTrack: document.getElementById('swipe-cards-track'),
    swipeCards: document.querySelectorAll('.fslide'),
    swipePrevBtn: document.getElementById('swipe-prev-btn'),
    swipeNextBtn: document.getElementById('swipe-next-btn'),

    // Catalog Section
    catalogSection: document.getElementById('catalog-section'),
    productCount: document.getElementById('product-count'),
    categoriesRow: document.getElementById('categories-row'),
    priceFilterGroup: document.getElementById('price-filter-group'),
    sortSelect: document.getElementById('sort-select'),
    productGrid: document.getElementById('product-grid'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Header & Promo Banner CTAs
    headerZaloBtn: document.getElementById('header-zalo-btn'),
    promoZaloBtn: document.getElementById('promo-zalo-btn'),

    // Product Detail Bottom Sheet Elements (Reworked)
    sheetBackdrop: document.getElementById('sheet-backdrop'),
    sheetContainer: document.getElementById('sheet-container'),
    sheetCloseBtn: document.getElementById('sheet-close-btn'),
    sheetImageBox: document.getElementById('sheet-image-box'),
    sheetImage: document.getElementById('sheet-image'),
    variantPhotoTag: document.getElementById('variant-photo-tag'),   // v15
    sheetZoomBtn: document.getElementById('sheet-zoom-btn'),
    sheetGalleryCount: document.getElementById('sheet-gallery-count'),
    sheetGalleryPrev: document.getElementById('sheet-gallery-prev'),
    sheetGalleryNext: document.getElementById('sheet-gallery-next'),
    sheetThumbsStrip: document.getElementById('sheet-thumbs-strip'),
    sheetCategory: document.getElementById('sheet-category'),
    sheetTitle: document.getElementById('sheet-title'),
    sheetPrice: document.getElementById('sheet-price'),
    sheetVariantPills: document.getElementById('sheet-variant-pills'),
    sheetDescCollapse: document.getElementById('sheet-desc-collapse'),
    sheetDesc: document.getElementById('sheet-desc'),
    btnDescToggle: document.getElementById('btn-desc-toggle'),
    btnDescToggleText: document.getElementById('btn-desc-toggle-text'),
    sheetZaloBtn: document.getElementById('sheet-zalo-btn'),

    // Fullscreen Lightbox Modal Elements
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxCounter: document.getElementById('lightbox-counter'),
    lightboxCloseBtn: document.getElementById('lightbox-close-btn'),
    lightboxBody: document.getElementById('lightbox-body'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxThumbs: document.getElementById('lightbox-thumbs'),

    // Demo Dialog elements
    demoDialogBackdrop: document.getElementById('demo-dialog-backdrop'),
    demoDialogMsgText: document.getElementById('demo-dialog-msg-text'),
    demoDialogCopyBtn: document.getElementById('demo-dialog-copy-btn'),
    demoDialogCloseBtn: document.getElementById('demo-dialog-close-btn'),

    // v10: Zalo Sheet elements
    zaloSheetBackdrop: document.getElementById('zalo-sheet-backdrop'),
    zaloSheetMsg: document.getElementById('zalo-sheet-msg'),
    zaloSheetCopyOpen: document.getElementById('zalo-sheet-copy-open'),
    zaloSheetOpenOnly: document.getElementById('zalo-sheet-open-only'),

    toastNotice: document.getElementById('toast-notice')
  };

  /**
   * Format number as Vietnamese Dong (e.g. 49000 -> "49.000đ")
   */
  function formatVND(amount) {
    if (typeof amount !== 'number') return '0đ';
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Check if ZALO_NUMBER is still placeholder demo value
   */
  function isPlaceholderZalo(zaloNumber) {
    if (!zaloNumber) return true;
    const cleanNum = zaloNumber.trim();
    return (
      cleanNum === '0123456789' ||
      cleanNum === '0000000000' ||
      cleanNum === 'YOUR_ZALO_NUMBER' ||
      cleanNum.startsWith('012345') ||
      cleanNum.length < 9
    );
  }

  /**
   * Construct Zalo deep link
   */
  function buildZaloUrl(product, variant) {
    const rawTemplate = getZaloTemplate();

    const formattedPrice = formatVND(variant.price);
    const message = rawTemplate
      .replace('{product_name}', product.name)
      .replace('{variant_name}', variant.name)
      .replace('{price}', formattedPrice);

    const zaloNumber = getZaloNumber();

    if (isPlaceholderZalo(zaloNumber)) {
      return { isDemo: true, message: message, zaloNumber: zaloNumber };
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://zalo.me/${zaloNumber}?text=${encodedMessage}`;
    return { isDemo: false, url: url, message: message, zaloNumber: zaloNumber };
  }

  /**
   * Handle user clicking on Chat Zalo
   */
  function handleZaloChat(product, variant) {
    const result = buildZaloUrl(product, variant);

    if (result.isDemo) {
      showDemoDialog(result.message);
      return;
    }

    // v10: hiện bảng giải thích copy/dán (Zalo mobile không tự điền tin nhắn)
    openZaloSheet(result.message, result.url);
  }

  /**
   * General inquiry via Zalo (header or promo banner)
   */
  function handleGeneralZaloInquiry() {
    const shopName = getShopName();
    const zaloNumber = getZaloNumber();
    const msg = `Chào ${shopName}, mình muốn nhận tư vấn và báo giá in 3D theo yêu cầu!`;

    if (isPlaceholderZalo(zaloNumber)) {
      showDemoDialog(msg);
      return;
    }
    // v10: dùng chung bảng Zalo sheet
    const url = `https://zalo.me/${zaloNumber}?text=${encodeURIComponent(msg)}`;
    openZaloSheet(msg, url);
  }

  // ====================================================================
  // v10: ZALO SHEET — bảng giải thích copy/dán
  // ====================================================================
  function openZaloSheet(message, url) {
    state.zaloSheet = { message: message, url: url };
    if (elements.zaloSheetMsg) elements.zaloSheetMsg.textContent = message;
    if (elements.zaloSheetBackdrop) {
      elements.zaloSheetBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeZaloSheet() {
    if (elements.zaloSheetBackdrop) elements.zaloSheetBackdrop.classList.remove('open');
    if (!elements.sheetBackdrop || !elements.sheetBackdrop.classList.contains('open')) {
      document.body.style.overflow = '';
    }
    state.zaloSheet = null;
  }

  function setupZaloSheet() {
    if (!elements.zaloSheetBackdrop) return;

    elements.zaloSheetBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.zaloSheetBackdrop) closeZaloSheet();
    });

    if (elements.zaloSheetCopyOpen) {
      elements.zaloSheetCopyOpen.addEventListener('click', () => {
        const data = state.zaloSheet;
        if (!data) return;
        // Mở Zalo NGAY trong gesture (tránh bị chặn popup), copy chạy song song
        closeZaloSheet();
        window.open(data.url, '_blank', 'noopener,noreferrer');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(data.message).catch(() => {});
        }
      });
    }

    if (elements.zaloSheetOpenOnly) {
      elements.zaloSheetOpenOnly.addEventListener('click', () => {
        const data = state.zaloSheet;
        closeZaloSheet();
        if (data && data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      });
    }
  }

  /**
   * Show demo modal dialog when Zalo number is placeholder
   */
  function showDemoDialog(messageText) {
    if (!elements.demoDialogBackdrop) {
      alert(messageText);
      return;
    }
    elements.demoDialogMsgText.textContent = messageText;
    elements.demoDialogBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function hideDemoDialog() {
    if (!elements.demoDialogBackdrop) return;
    elements.demoDialogBackdrop.classList.remove('open');
    if (!elements.sheetBackdrop || !elements.sheetBackdrop.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  function showToast(message) {
    if (!elements.toastNotice) return;
    elements.toastNotice.textContent = message;
    elements.toastNotice.classList.add('show');
    setTimeout(() => {
      elements.toastNotice.classList.remove('show');
    }, 2400);
  }

  /**
   * Initialize Shop Configuration across DOM
   */
  function initConfig() {
    // Tên shop + tiêu đề trang được áp trong applySettings() (ưu tiên database)
    const shopName = getShopName();
    elements.shopNameElements.forEach(el => {
      el.textContent = shopName;
    });
    document.title = shopName;
  }

  /**
   * Category icon helper
   */
  function getCategoryIconSvg(category) {
    if (category === 'Tất cả') {
      return `<svg class="category-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    } else if (category.includes('Móc khóa')) {
      return `<svg class="category-chip-icon" style="color: #F59E0B;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3"></path></svg>`;
    } else if (category.includes('Mô hình')) {
      return `<svg class="category-chip-icon" style="color: #8B5CF6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    } else if (category.includes('Gia dụng')) {
      return `<svg class="category-chip-icon" style="color: #10B981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`;
    } else if (category.includes('Fidget')) {
      return `<svg class="category-chip-icon" style="color: #EC4899;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`;
    }
    return `<svg class="category-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }

  /**
   * Extract distinct categories and populate category chips
   */
  function initCategories() {
    const products = getProducts();
    if (!elements.categoriesRow || !products.length) return;

    const categoryCounts = { 'Tất cả': products.length };
    const categories = ['Tất cả'];

    products.forEach(item => {
      const cat = item.category;
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        if (!categories.includes(cat)) {
          categories.push(cat);
        }
      }
    });

    elements.categoriesRow.innerHTML = '';

    categories.forEach(cat => {
      const count = categoryCounts[cat] || 0;
      const isAll = cat === 'Tất cả';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `category-chip ${isAll ? 'active' : ''}`;
      btn.setAttribute('data-category', isAll ? 'all' : cat);
      btn.innerHTML = `
        ${getCategoryIconSvg(cat)}
        <span>${cat}</span>
        <span class="category-chip-count">${count}</span>
      `;

      btn.addEventListener('click', () => {
        elements.categoriesRow.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedCategory = isAll ? 'all' : cat;
        renderProducts();
      });

      elements.categoriesRow.appendChild(btn);
    });
  }

  function selectCategory(categoryName, shouldScroll = true) {
    state.selectedCategory = categoryName;

    if (elements.categoriesRow) {
      elements.categoriesRow.querySelectorAll('.category-chip').forEach(b => {
        const cat = b.getAttribute('data-category');
        b.classList.toggle('active', cat === categoryName);
      });
    }

    renderProducts();

    if (shouldScroll && elements.catalogSection) {
      elements.catalogSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Filter and sort products
   */
  function getFilteredProducts() {
    let list = getProducts().slice();
    if (!list.length) return [];

    if (state.newOnly) {
      list = list.filter(item => item.isNew);
    }

    if (state.selectedCategory !== 'all') {
      list = list.filter(item => item.category === state.selectedCategory);
    }

    if (state.selectedPriceRange !== 'all') {
      list = list.filter(item => {
        const minPrice = Math.min(...item.variants.map(v => v.price));
        if (state.selectedPriceRange === 'under50') {
          return minPrice < 50000;
        } else if (state.selectedPriceRange === '50to100') {
          return minPrice >= 50000 && minPrice <= 100000;
        } else if (state.selectedPriceRange === 'over100') {
          return minPrice > 100000;
        }
        return true;
      });
    }

    list.sort((a, b) => {
      const aMinPrice = Math.min(...a.variants.map(v => v.price));
      const bMinPrice = Math.min(...b.variants.map(v => v.price));

      if (state.sortBy === 'price-asc') {
        return aMinPrice - bMinPrice;
      } else if (state.sortBy === 'price-desc') {
        return bMinPrice - aMinPrice;
      } else {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return 0;
      }
    });

    return list;
  }

  /**
   * Render product grid & update heading count
   */
  function renderProducts() {
    const list = getFilteredProducts();

    if (elements.productCount) {
      elements.productCount.textContent = `${list.length} sản phẩm`;
    }

    if (list.length === 0) {
      elements.productGrid.style.display = 'none';
      if (elements.emptyState) elements.emptyState.style.display = 'block';
      return;
    }

    elements.productGrid.style.display = 'grid';
    if (elements.emptyState) elements.emptyState.style.display = 'none';

    elements.productGrid.innerHTML = '';

    list.forEach(product => {
      const card = createProductCard(product);
      elements.productGrid.appendChild(card);
    });
  }

  function createProductCard(product) {
    const minPrice = Math.min(...product.variants.map(v => v.price));
    const defaultVariant = product.variants[0];

    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);

    card.innerHTML = `
      <div class="card-image-box">
        <img 
          src="${product.image}" 
          alt="${product.name}" 
          class="card-image"
          loading="lazy"
          onerror="this.onerror=null; this.src='images/logo.png';"
        />
        ${product.isNew ? '<span class="card-blue-badge">Mới</span>' : ''}
        ${product.isFeatured ? '<span class="card-featured-tag">★ Nổi bật</span>' : ''}
        ${customTagHtml(product)}
      </div>
      <div class="card-body">
        <h3 class="card-title">${product.name}</h3>
        <span class="card-category">${product.category}</span>
        
        <div class="card-price-row">
          <span class="card-price">${formatVND(minPrice)}</span>
        </div>
        
        <button type="button" class="btn-card-zalo" data-action="zalo">
          <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
            <path d="M24 3C12.4 3 3 10.9 3 20.6c0 4.4 1.9 8.5 5 11.5l-1.7 6c-.3 1.2 1 2.2 2 1.7l7-3c2.4.8 5 1.2 7.7 1.2 11.6 0 21-7.9 21-17.4S35.6 3 24 3z" fill="#FFFFFF"/>
            <text x="24" y="25.5" text-anchor="middle" fill="#1D4ED8" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="700">Zalo</text>
          </svg>
          Chat Zalo
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const zaloBtn = e.target.closest('[data-action="zalo"]');
      if (zaloBtn) {
        e.stopPropagation();
        handleZaloChat(product, defaultVariant);
      } else {
        openBottomSheet(product);
      }
    });

    return card;
  }

  /**
   * REWORKED PRODUCT DETAIL BOTTOM SHEET (Order B.1 -> B.6)
   * 1. Image gallery (1/3 counter, thumbnails, zoom button for lightbox)
   * 2. Category, Title, Price
   * 3. Variant selector (MOVED ABOVE details section)
   * 4. Details toggle (renamed to "Chi tiết sản phẩm ▾", HIDDEN COMPLETELY by default)
   * 5. "Chất liệu in" and "Thời gian in" boxes REMOVED ENTIRELY
   * 6. Sticky "Chat Zalo Đặt Hàng Mẫu Này" button at bottom
   */
  function openBottomSheet(product) {
    state.activeProduct = product;
    state.selectedVariantIndex = 0;
    state.selectedOptions = {};
    // v9: mặc định chọn giá trị đầu tiên của mỗi nhóm phân loại
    // v15: values là object {value, image_url} -> selectedOptions vẫn lưu chuỗi để khớp SKU
    if (product.vgroups && product.vgroups.length) {
      product.vgroups.forEach(g => { state.selectedOptions[g.name] = g.values[0].value; });
    }
    state.activeGalleryIndex = 0;
    state.isDescExpanded = false;

    // Determine gallery images
    const galleryImages = (product.images && product.images.length > 0) 
      ? product.images 
      : [product.image];

    // B.1: Set gallery images, thumbnails & zoom button
    // v15: chèn ảnh của phân loại mặc định (nếu có) lên đầu
    setupSheetGallery(getDisplayImages());

    // B.2: Meta & Title & Price
    if (elements.sheetCategory) elements.sheetCategory.textContent = product.category;
    if (elements.sheetTitle) elements.sheetTitle.textContent = product.name;

    // B.3: Variant Picker (MOVED ABOVE DETAILS SECTION)
    renderVariantPills();
    updateSheetPrice();

    // B.4: Details Toggle - HIDDEN COMPLETELY by default (compact sheet)
    if (elements.sheetDesc) {
      elements.sheetDesc.textContent = product.description || 'Sản phẩm in 3D tinh xảo theo yêu cầu.';
    }
    if (elements.sheetDescCollapse) {
      elements.sheetDescCollapse.style.display = 'none';
    }
    if (elements.btnDescToggleText) {
      elements.btnDescToggleText.textContent = 'Chi tiết sản phẩm ▾';
    }

    // B.5: "Chất liệu in" and "Thời gian in" removed entirely

    elements.sheetBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function setupSheetGallery(images) {
    state.activeGalleryIndex = 0;
    updateGalleryView(images, 0);

    // Zoom Button on bottom sheet image opens Fullscreen Lightbox
    if (elements.sheetZoomBtn) {
      elements.sheetZoomBtn.onclick = (e) => {
        e.stopPropagation();
        openLightbox(images, state.activeGalleryIndex);
      };
    }

    // Clicking the sheet image directly also opens Fullscreen Lightbox
    if (elements.sheetImage) {
      elements.sheetImage.onclick = () => {
        openLightbox(images, state.activeGalleryIndex);
      };
    }

    // Render thumbnails (min 44px touch target)
    if (elements.sheetThumbsStrip) {
      elements.sheetThumbsStrip.innerHTML = '';
      if (images.length > 1) {
        elements.sheetThumbsStrip.style.display = 'flex';
        images.forEach((imgSrc, idx) => {
          const thumb = document.createElement('div');
          thumb.className = `sheet-thumb-item ${idx === 0 ? 'active' : ''}`;
          thumb.innerHTML = `<img src="${imgSrc}" alt="Thumbnail ${idx + 1}" onerror="this.onerror=null; this.src='images/logo.png';" />`;
          thumb.addEventListener('click', () => {
            state.activeGalleryIndex = idx;
            updateGalleryView(images, idx);
          });
          elements.sheetThumbsStrip.appendChild(thumb);
        });
      } else {
        elements.sheetThumbsStrip.style.display = 'none';
      }
    }

    // Prev / Next button handlers (min 44px tap targets)
    if (elements.sheetGalleryPrev) {
      elements.sheetGalleryPrev.style.display = images.length > 1 ? 'flex' : 'none';
      elements.sheetGalleryPrev.onclick = (e) => {
        e.stopPropagation();
        let nextIdx = state.activeGalleryIndex - 1;
        if (nextIdx < 0) nextIdx = images.length - 1;
        state.activeGalleryIndex = nextIdx;
        updateGalleryView(images, nextIdx);
      };
    }

    if (elements.sheetGalleryNext) {
      elements.sheetGalleryNext.style.display = images.length > 1 ? 'flex' : 'none';
      elements.sheetGalleryNext.onclick = (e) => {
        e.stopPropagation();
        let nextIdx = state.activeGalleryIndex + 1;
        if (nextIdx >= images.length) nextIdx = 0;
        state.activeGalleryIndex = nextIdx;
        updateGalleryView(images, nextIdx);
      };
    }
  }

  function updateGalleryView(images, index) {
    if (!elements.sheetImage) return;
    elements.sheetImage.src = images[index];
    elements.sheetImage.alt = state.activeProduct ? state.activeProduct.name : '';

    if (elements.sheetGalleryCount) {
      elements.sheetGalleryCount.textContent = `${index + 1}/${images.length}`;
      elements.sheetGalleryCount.style.display = images.length > 1 ? 'block' : 'none';
    }

    // Update thumbnail active ring
    if (elements.sheetThumbsStrip) {
      elements.sheetThumbsStrip.querySelectorAll('.sheet-thumb-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
    }

    refreshVariantPhotoTag();   // v15: hiện/ẩn tag "ảnh thật của phân loại"
  }

  /**
   * v15: ảnh thật của phân loại đang chọn (ưu tiên nhóm đầu tiên có ảnh).
   * Trả về URL hoặc null.
   */
  function getSelectedVariantImage() {
    const product = state.activeProduct;
    if (!product || !product.vgroups || !product.vgroups.length) return null;
    for (const g of product.vgroups) {
      const sel = state.selectedOptions[g.name];
      const obj = (g.values || []).find(o => o.value === sel);
      if (obj && obj.image_url) return obj.image_url;
    }
    return null;
  }

  /**
   * v15: danh sách ảnh hiển thị = [ảnh phân loại (nếu có), ...ảnh sản phẩm].
   * Ảnh phân loại đứng đầu để khách thấy ngay khi đổi lựa chọn.
   */
  function getDisplayImages() {
    const product = state.activeProduct;
    const defaults = (product.images && product.images.length) ? product.images : [product.image];
    const vImg = getSelectedVariantImage();
    return vImg ? [vImg, ...defaults] : defaults;
  }

  /**
   * v15: dựng lại gallery khi đổi phân loại (kèm tag ảnh thật).
   */
  function refreshGalleryForVariant() {
    setupSheetGallery(getDisplayImages());
  }

  /**
   * v15: hiện tag "🖼️ Ảnh thật của phân loại này" khi đang xem ảnh phân loại.
   */
  function refreshVariantPhotoTag() {
    if (!elements.variantPhotoTag) return;
    const show = !!getSelectedVariantImage() && state.activeGalleryIndex === 0;
    elements.variantPhotoTag.classList.toggle('show', show);
  }

  /**
   * v9: variant đang được chọn (SKU). Kiểu nhóm -> tìm theo tổ hợp,
   * kiểu cũ -> theo index pill phẳng.
   */
  function getActiveVariant() {
    const product = state.activeProduct;
    if (!product) return { name: '', price: 0, stock: 0 };
    if (product.vgroups && product.vgroups.length) {
      return findSkuBySelection(product, state.selectedOptions)
        || product.variants[0]
        || { name: '', price: 0, stock: 0 };
    }
    return product.variants[state.selectedVariantIndex]
      || product.variants[0]
      || { name: '', price: 0, stock: 0 };
  }

  function renderVariantPills() {
    const product = state.activeProduct;
    if (!product || !elements.sheetVariantPills) return;

    elements.sheetVariantPills.innerHTML = '';

    // v22: sản phẩm không phân loại (chỉ 1 variant "Mặc định") -> ẩn hẳn selector
    const section = elements.sheetVariantPills.closest('.sheet-variants-section');
    const isSimple = (!product.vgroups || !product.vgroups.length)
      && product.variants.length === 1 && product.variants[0].name === 'Mặc định';
    if (section) section.style.display = isSimple ? 'none' : '';
    if (isSimple) return;

    // v9: picker 2 cấp kiểu Shopee (nhóm -> giá trị)
    if (product.vgroups && product.vgroups.length) {
      product.vgroups.forEach(g => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'variant-group-block';

        const label = document.createElement('div');
        label.className = 'variant-group-label';
        label.textContent = g.name;
        groupDiv.appendChild(label);

        const pillsRow = document.createElement('div');
        pillsRow.className = 'variant-group-pills';
        pillsRow.setAttribute('role', 'radiogroup');
        pillsRow.setAttribute('aria-label', g.name);

        g.values.forEach(obj => {
          const val = obj.value;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `variant-pill-btn ${state.selectedOptions[g.name] === val ? 'active' : ''}`;
          // v23b: bỏ icon 🖼️ sau tên phân loại theo yêu cầu (vẫn đổi ảnh khi bấm)
          btn.innerHTML = `<span>${val}</span>`;
          btn.addEventListener('click', () => {
            state.selectedOptions[g.name] = val;
            pillsRow.querySelectorAll('.variant-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateSheetPrice();
            refreshGalleryForVariant();   // v15: đổi ảnh theo phân loại
          });
          pillsRow.appendChild(btn);
        });

        groupDiv.appendChild(pillsRow);
        elements.sheetVariantPills.appendChild(groupDiv);
      });
      return;
    }

    // Kiểu cũ: pills phẳng
    product.variants.forEach((v, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `variant-pill-btn ${index === state.selectedVariantIndex ? 'active' : ''}`;
      btn.innerHTML = `<span>${v.name}</span>`;

      btn.addEventListener('click', () => {
        elements.sheetVariantPills.querySelectorAll('.variant-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedVariantIndex = index;
        updateSheetPrice();
      });

      elements.sheetVariantPills.appendChild(btn);
    });
  }

  function updateSheetPrice() {
    const product = state.activeProduct;
    if (!product || !elements.sheetPrice) return;

    const variant = getActiveVariant();
    elements.sheetPrice.textContent = formatVND(variant.price);
  }

  function closeBottomSheet() {
    elements.sheetBackdrop.classList.remove('open');
    if (!elements.demoDialogBackdrop || !elements.demoDialogBackdrop.classList.contains('open')) {
      if (!elements.lightboxModal || !elements.lightboxModal.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }
    state.activeProduct = null;
  }

  // ====================================================================
  // 3. SWIPE CARDS LOGIC (3:4 Portrait, 5s Auto-Advance, Touch & Mouse Drag)
  // ====================================================================
  // Danh sách ảnh cho lightbox của khu "Ảnh thật" — lấy từ database (tab Ảnh thật)
  function getSwipeCardImages() {
    return (state.gallery && state.gallery.length) ? state.gallery : [];
  }

  /**
   * v23: Băng chuyền "Ảnh thật" kiểu filmstrip — 1 tấm chính + 2 tấm phụ mờ kính,
   * lướt ngang (track translate), tự chạy mỗi 3 giây, không chấm đếm.
   */
  function initSwipeCards() {
    const track = elements.swipeCardsTrack;
    const viewport = elements.swipeCardsViewport;
    if (!viewport || !track) return;
    const slides = Array.from(track.querySelectorAll('.fslide'));
    const N = state.filmN || 0;
    if (!slides.length || !N) return;
    const C = FILM_CLONES;

    let idx = C; // vị trí trên track (đã tính clone)
    let animating = false;

    // Đo bước trượt từ DOM (đúng với mọi breakpoint)
    function step() {
      const s = slides[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return s + gap;
    }
    function centerOffset() {
      return (viewport.clientWidth - slides[0].getBoundingClientRect().width) / 2;
    }
    // Chỉ hiện 3 tấm: chính + 2 phụ; tấm xa ẩn hẳn
    function paint() {
      slides.forEach((s, k) => {
        const diff = k - idx;
        s.classList.toggle('active', diff === 0);
        s.classList.toggle('far', Math.abs(diff) > 1);
      });
    }
    function apply(animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translateX(' + (-idx * step() + centerOffset()) + 'px)';
      paint();
    }
    function realIndex() {
      return (((idx - C) % N) + N) % N;
    }
    function go(n) {
      if (animating) return;
      animating = true;
      idx = n;
      apply(true);
    }
    track.addEventListener('transitionend', () => {
      animating = false;
      if (idx < C) { idx += N; apply(false); }
      else if (idx >= N + C) { idx -= N; apply(false); }
    });

    // Tự chạy mỗi 3 giây, vòng lặp vô hạn
    function startAuto() {
      stopAuto();
      state.swipeAutoTimer = setInterval(() => go(idx + 1), 3000);
    }
    function stopAuto() {
      if (state.swipeAutoTimer) { clearInterval(state.swipeAutoTimer); state.swipeAutoTimer = null; }
    }
    function pauseAndResume() {
      stopAuto();
      if (state.swipeResumeTimer) clearTimeout(state.swipeResumeTimer);
      state.swipeResumeTimer = setTimeout(startAuto, 3000);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAuto();
      else pauseAndResume();
    });

    // Nút mũi tên
    if (elements.swipePrevBtn) elements.swipePrevBtn.addEventListener('click', (e) => {
      e.stopPropagation(); go(idx - 1); pauseAndResume();
    });
    if (elements.swipeNextBtn) elements.swipeNextBtn.addEventListener('click', (e) => {
      e.stopPropagation(); go(idx + 1); pauseAndResume();
    });

    // Bấm tấm phụ -> chuyển; bấm tấm chính / nút zoom -> phóng to
    let dragDist = 0;
    slides.forEach((slide, k) => {
      slide.addEventListener('click', (e) => {
        if (Math.abs(dragDist) > 8) return;
        const diff = k - idx;
        if (diff === -1) { go(idx - 1); pauseAndResume(); }
        else if (diff === 1) { go(idx + 1); pauseAndResume(); }
        else if (diff === 0) openLightbox(getSwipeCardImages(), realIndex());
      });
      const zoomBtn = slide.querySelector('.swipe-card-zoom-btn');
      if (zoomBtn) zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(getSwipeCardImages(), realIndex());
      });
    });

    // Kéo thả (chuột + chạm)
    let dragging = false, startX = 0, dx = 0;
    function dragStart(x) {
      dragging = true; startX = x; dx = 0; dragDist = 0;
      stopAuto();
      track.style.transition = 'none';
      viewport.classList.add('grabbing');
    }
    function dragMove(x) {
      if (!dragging) return;
      dx = x - startX;
      dragDist = Math.abs(dx);
      track.style.transform = 'translateX(' + (-idx * step() + centerOffset() + dx) + 'px)';
    }
    function dragEnd() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('grabbing');
      if (dx < -50) go(idx + 1);
      else if (dx > 50) go(idx - 1);
      else apply(true);
      pauseAndResume();
    }
    viewport.addEventListener('mousedown', (e) => dragStart(e.clientX));
    window.addEventListener('mousemove', (e) => { if (dragging) e.preventDefault(); dragMove(e.clientX); });
    window.addEventListener('mouseup', dragEnd);
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) dragStart(e.touches[0].clientX);
    }, { passive: true });
    viewport.addEventListener('touchmove', (e) => {
      if (dragging && e.touches.length === 1) dragMove(e.touches[0].clientX);
    }, { passive: true });
    viewport.addEventListener('touchend', dragEnd, { passive: true });
    viewport.addEventListener('touchcancel', dragEnd, { passive: true });

    // Hover thì dừng (desktop)
    viewport.addEventListener('mouseenter', stopAuto);
    viewport.addEventListener('mouseleave', () => { if (!dragging) pauseAndResume(); });

    window.addEventListener('resize', () => apply(false));

    // Dựng layout ban đầu + bắt đầu tự chạy 3s
    apply(false);
    startAuto();
  }

  // ====================================================================
  // 4. FULLSCREEN LIGHTBOX MODAL LOGIC (Zoomed Photo Viewer)
  // ====================================================================
  function openLightbox(images, initialIndex) {
    if (!images || !images.length) return;
    state.lightboxImages = images;
    state.lightboxIndex = initialIndex || 0;

    updateLightboxView();

    if (elements.lightboxModal) {
      elements.lightboxModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function updateLightboxView() {
    if (!elements.lightboxModal) return;

    const count = state.lightboxImages.length;
    const currentSrc = state.lightboxImages[state.lightboxIndex];

    if (elements.lightboxImage) {
      elements.lightboxImage.src = currentSrc;
    }

    if (elements.lightboxCounter) {
      elements.lightboxCounter.textContent = `${state.lightboxIndex + 1}/${count}`;
      elements.lightboxCounter.style.display = count > 1 ? 'block' : 'none';
    }

    // Prev / Next button visibility
    if (elements.lightboxPrev) {
      elements.lightboxPrev.style.display = count > 1 ? 'flex' : 'none';
    }
    if (elements.lightboxNext) {
      elements.lightboxNext.style.display = count > 1 ? 'flex' : 'none';
    }

    // Thumbnails in Lightbox
    if (elements.lightboxThumbs) {
      elements.lightboxThumbs.innerHTML = '';
      if (count > 1) {
        state.lightboxImages.forEach((imgSrc, idx) => {
          const thumb = document.createElement('div');
          thumb.className = `lightbox-thumb-item ${idx === state.lightboxIndex ? 'active' : ''}`;
          thumb.innerHTML = `<img src="${imgSrc}" alt="Ảnh phóng to ${idx + 1}" onerror="this.onerror=null; this.src='images/logo.png';" />`;
          thumb.addEventListener('click', () => {
            state.lightboxIndex = idx;
            updateLightboxView();
          });
          elements.lightboxThumbs.appendChild(thumb);
        });
      }
    }
  }

  function closeLightbox() {
    if (elements.lightboxModal) {
      elements.lightboxModal.classList.remove('open');
    }
    // Only restore body scrolling if bottom sheet or demo dialog is not open
    const isSheetOpen = elements.sheetBackdrop && elements.sheetBackdrop.classList.contains('open');
    const isDialogOpen = elements.demoDialogBackdrop && elements.demoDialogBackdrop.classList.contains('open');
    if (!isSheetOpen && !isDialogOpen) {
      document.body.style.overflow = '';
    }
  }

  function setupLightboxListeners() {
    if (elements.lightboxCloseBtn) {
      elements.lightboxCloseBtn.addEventListener('click', closeLightbox);
    }

    if (elements.lightboxPrev) {
      elements.lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.lightboxImages.length > 1) {
          state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
          updateLightboxView();
        }
      });
    }

    if (elements.lightboxNext) {
      elements.lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.lightboxImages.length > 1) {
          state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
          updateLightboxView();
        }
      });
    }

    // Close on backdrop click (outside image container and navigation)
    if (elements.lightboxModal) {
      elements.lightboxModal.addEventListener('click', (e) => {
        if (e.target === elements.lightboxModal || e.target === elements.lightboxBody) {
          closeLightbox();
        }
      });
    }

    // Touch swipe support in lightbox
    if (elements.lightboxBody) {
      let touchStartX = 0;
      let touchEndX = 0;

      elements.lightboxBody.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      elements.lightboxBody.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) > 40 && state.lightboxImages.length > 1) {
          if (diffX < 0) {
            // Next
            state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
            updateLightboxView();
          } else {
            // Prev
            state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
            updateLightboxView();
          }
        }
      }, { passive: true });
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // 1. v24: Nút lọc "Sản phẩm mới" — bấm bật/tắt lọc isNew
    if (elements.newFilterBtn) {
      elements.newFilterBtn.addEventListener('click', () => {
        state.newOnly = !state.newOnly;
        elements.newFilterBtn.classList.toggle('on', state.newOnly);
        elements.newFilterBtn.setAttribute('aria-pressed', String(state.newOnly));
        renderProducts();
      });
    }

    // 2. Price Filter Chips
    if (elements.priceFilterGroup) {
      elements.priceFilterGroup.querySelectorAll('.price-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const range = chip.getAttribute('data-price-range');
          if (state.selectedPriceRange === range && range !== 'all') {
            state.selectedPriceRange = 'all';
            elements.priceFilterGroup.querySelectorAll('.price-chip').forEach(c => {
              c.classList.toggle('active', c.getAttribute('data-price-range') === 'all');
            });
          } else {
            state.selectedPriceRange = range;
            elements.priceFilterGroup.querySelectorAll('.price-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
          }
          renderProducts();
        });
      });
    }

    // 4. Sort Select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderProducts();
      });
    }

    // 5. Reset Filters
    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.addEventListener('click', () => {
        state.newOnly = false;
        state.selectedCategory = 'all';
        state.selectedPriceRange = 'all';
        if (elements.newFilterBtn) {
          elements.newFilterBtn.classList.remove('on');
          elements.newFilterBtn.setAttribute('aria-pressed', 'false');
        }

        if (elements.categoriesRow) {
          elements.categoriesRow.querySelectorAll('.category-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-category') === 'all');
          });
        }
        if (elements.priceFilterGroup) {
          elements.priceFilterGroup.querySelectorAll('.price-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-price-range') === 'all');
          });
        }
        renderProducts();
      });
    }

    // 6. Header Zalo & Promo Zalo CTA
    if (elements.headerZaloBtn) {
      elements.headerZaloBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGeneralZaloInquiry();
      });
    }

    if (elements.promoZaloBtn) {
      elements.promoZaloBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGeneralZaloInquiry();
      });
    }

    // 7. Description Accordion Toggle: "Chi tiết sản phẩm ▾" / "Chi tiết sản phẩm ▴"
    if (elements.btnDescToggle) {
      elements.btnDescToggle.addEventListener('click', () => {
        state.isDescExpanded = !state.isDescExpanded;
        if (state.isDescExpanded) {
          if (elements.sheetDescCollapse) elements.sheetDescCollapse.style.display = 'block';
          if (elements.btnDescToggleText) elements.btnDescToggleText.textContent = 'Chi tiết sản phẩm ▴';
        } else {
          if (elements.sheetDescCollapse) elements.sheetDescCollapse.style.display = 'none';
          if (elements.btnDescToggleText) elements.btnDescToggleText.textContent = 'Chi tiết sản phẩm ▾';
        }
      });
    }

    // 8. Touch swipe support for sheet gallery
    if (elements.sheetImageBox) {
      let touchStartX = 0;
      let touchEndX = 0;

      elements.sheetImageBox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      elements.sheetImageBox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) > 40 && state.activeProduct) {
          const imgs = (state.activeProduct.images && state.activeProduct.images.length > 0)
            ? state.activeProduct.images
            : [state.activeProduct.image];

          if (imgs.length > 1) {
            if (diffX < 0) {
              // Swiped left -> next image
              let nextIdx = state.activeGalleryIndex + 1;
              if (nextIdx >= imgs.length) nextIdx = 0;
              state.activeGalleryIndex = nextIdx;
              updateGalleryView(imgs, nextIdx);
            } else {
              // Swiped right -> prev image
              let prevIdx = state.activeGalleryIndex - 1;
              if (prevIdx < 0) prevIdx = imgs.length - 1;
              state.activeGalleryIndex = prevIdx;
              updateGalleryView(imgs, prevIdx);
            }
          }
        }
      }, { passive: true });
    }

    // 9. Bottom Sheet Close & Backdrop Click
    if (elements.sheetCloseBtn) {
      elements.sheetCloseBtn.addEventListener('click', closeBottomSheet);
    }

    if (elements.sheetBackdrop) {
      elements.sheetBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.sheetBackdrop) {
          closeBottomSheet();
        }
      });
    }

    if (elements.sheetZaloBtn) {
      elements.sheetZaloBtn.addEventListener('click', () => {
        if (!state.activeProduct) return;
        handleZaloChat(state.activeProduct, getActiveVariant());
      });
    }

    // 10. Lightbox Listeners
    setupLightboxListeners();

    // 11. Demo Dialog Events
    if (elements.demoDialogCloseBtn) {
      elements.demoDialogCloseBtn.addEventListener('click', hideDemoDialog);
    }

    if (elements.demoDialogBackdrop) {
      elements.demoDialogBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.demoDialogBackdrop) {
          hideDemoDialog();
        }
      });
    }

    if (elements.demoDialogCopyBtn) {
      elements.demoDialogCopyBtn.addEventListener('click', () => {
        const text = elements.demoDialogMsgText.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('Đã sao chép tin nhắn!');
        }).catch(() => {
          showToast('Đã chọn tin nhắn');
        });
      });
    }

    // 12. v10: Zalo Sheet Events
    setupZaloSheet();

    // 12. ESC Key dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.lightboxModal && elements.lightboxModal.classList.contains('open')) {
          closeLightbox();
        } else if (elements.demoDialogBackdrop && elements.demoDialogBackdrop.classList.contains('open')) {
          hideDemoDialog();
        } else if (elements.sheetBackdrop && elements.sheetBackdrop.classList.contains('open')) {
          closeBottomSheet();
        }
      }
    });
  }

  // INITIALIZE
  async function init() {
    initConfig();
    // v23c: áp chữ đã lưu trong máy NGAY (không chờ mạng) để không chớp chữ mặc định
    const cachedSettings = readSettingsCache();
    if (cachedSettings) {
      state.settings = cachedSettings;
      applySettings(true);
    }
    const [products, site] = await Promise.all([loadProductsFromSource(), loadSiteContent()]);
    state.products = products;
    // v23c: mạng lỗi trả về rỗng thì GIỮ chữ đã cache, không để nhảy về mặc định
    if (site.settings && Object.keys(site.settings).length) {
      state.settings = site.settings;
    }
    state.gallery = site.gallery;
    applySettings();
    renderGallery();
    initCategories();
    initSwipeCards();
    setupEventListeners();
    renderProducts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
