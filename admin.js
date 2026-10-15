/**
 * TRANG QUẢN TRỊ SẢN PHẨM — dùng Supabase làm database
 * Đăng nhập → thêm/sửa/xóa sản phẩm + up ảnh từ điện thoại.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const cfg = window.CONFIG || {};
  const hasConfig = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  let client = null;
  let editingId = null;      // id sản phẩm đang sửa (null = thêm mới)
  let imageUrls = [];        // danh sách URL ảnh trong form
  // v9: nhóm phân loại kiểu Shopee — [{ name: 'Màu sắc', values: ['Xanh Dương', ...] }]
  let vgroups = [];
  // v9: giá + tồn kho từng tổ hợp SKU — { 'Xanh Dương, 7 màu': { price, stock } }
  let skuData = {};
  // v22: chế độ nền tag ('solid' | 'gradient')
  let tagMode = 'solid';

  // ---------- Tiện ích ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function vnd(n) {
    return Number(n || 0).toLocaleString('vi-VN') + 'đ';
  }
  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'san-pham';
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // ---------- Đăng nhập ----------
  async function signIn() {
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    const errBox = $('login-error');
    errBox.classList.add('hidden');
    if (!email || !password) return showError(errBox, 'Nhập email và mật khẩu.');
    const btn = $('btn-login');
    btn.disabled = true;
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast('Đăng nhập thành công 🎉');
    } catch (e) {
      showError(errBox, 'Đăng nhập thất bại: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }
  async function signOut() {
    await client.auth.signOut();
    toast('Đã đăng xuất');
  }
  function setLoggedIn(on) {
    $('login-box').classList.toggle('hidden', on);
    $('tab-bar').classList.toggle('hidden', !on);
    $('btn-logout').classList.toggle('hidden', !on);
    if (on) {
      switchTab('products');
    } else {
      document.querySelectorAll('.tab-pane').forEach(t => t.classList.add('hidden'));
      closeEditor();
    }
  }

  // ---------- Tabs ----------
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.getAttribute('data-tab') === name));
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.add('hidden'));
    const pane = $('tab-' + name);
    if (pane) pane.classList.remove('hidden');
    closeEditor();
    if (name === 'products') loadProducts();
    if (name === 'gallery') loadGallery();
    if (name === 'settings') loadSettings();
  }

  // ---------- Danh sách sản phẩm ----------
  async function loadProducts() {
    const list = $('product-list');
    list.innerHTML = '<p class="muted">Đang tải...</p>';
    try {
      const { data, error } = await client
        .from('products')
        .select('id, name, category, image, is_new, is_featured, tag_text, tag_text_color, tag_bg_color, tag_bg_color2, product_variants(price)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data.length) {
        list.innerHTML = '<p class="muted">Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để tạo món đầu tiên.</p>';
        return;
      }
      // Gợi ý danh mục cho datalist
      const cats = [...new Set(data.map(p => p.category).filter(Boolean))];
      $('category-list').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');

      list.innerHTML = '';
      data.forEach(p => {
        const prices = (p.product_variants || []).map(v => Number(v.price) || 0);
        const priceText = prices.length
          ? (Math.min(...prices) === Math.max(...prices) ? vnd(prices[0]) : vnd(Math.min(...prices)) + ' – ' + vnd(Math.max(...prices)))
          : 'chưa có giá';
        const row = document.createElement('div');
        row.className = 'product-row';
        row.innerHTML = `
          <img src="${esc(p.image || '')}" alt="" onerror="this.style.visibility='hidden'" />
          <div class="info">
            <div class="name">${esc(p.name)}${p.is_featured ? ' 📌' : ''}${p.is_new ? ' 🆕' : ''}</div>
            <div class="sub">${esc(p.category || '')} · ${priceText}</div>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${esc(p.id)}">Sửa</button>
          </div>`;
        row.querySelector('[data-edit]').addEventListener('click', () => openEditor(p.id));
        list.appendChild(row);
      });
    } catch (e) {
      list.innerHTML = `<p class="error">Không tải được: ${esc(e.message || e)}</p>`;
    }
  }

  // ---------- v9: Phân loại hàng kiểu Shopee ----------
  // Sinh tổ hợp SKU từ các nhóm (tích Descartes), vd ["Xanh Dương","7 màu"] x ["Trắng Ấm"]
  function genSkuNames() {
    const lists = vgroups.map(g => g.values.map(o => o.value)).filter(v => v.length > 0);
    if (!lists.length) return [];
    let out = lists[0].slice();
    for (let i = 1; i < lists.length; i++) {
      const next = [];
      out.forEach(a => lists[i].forEach(b => next.push(a + ', ' + b)));
      out = next;
    }
    return out;
  }

  function renderGroups() {
    const wrap = $('variant-groups');
    wrap.innerHTML = '';
    vgroups.forEach((g, gi) => {
      const card = document.createElement('div');
      card.className = 'var-group-card';

      const head = document.createElement('div');
      head.className = 'var-group-head';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Tên phân loại (VD: Màu sắc)';
      nameInput.value = g.name || '';
      nameInput.addEventListener('input', () => { g.name = nameInput.value.trim(); renderSkus(); updateVariantUI(); });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'var-group-del';
      delBtn.textContent = 'Xóa';
      delBtn.addEventListener('click', () => {
        // v22: phân loại không bắt buộc -> cho xóa hết, giữ lại 1 dòng trống
        vgroups.splice(gi, 1);
        if (!vgroups.length) vgroups.push({ name: '', values: [] });
        renderGroups();
        renderSkus();
      });
      head.appendChild(nameInput);
      head.appendChild(delBtn);
      card.appendChild(head);

      // v15: mỗi giá trị = 1 hàng có ô ảnh riêng (không bắt buộc)
      const valsWrap = document.createElement('div');
      valsWrap.className = 'var-values';
      g.values.forEach((obj, vi) => {
        const row = document.createElement('div');
        row.className = 'var-val-row';

        // Ô ảnh: bấm để đổi/chọn ảnh
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'var-val-thumb' + (obj.image_url ? '' : ' empty');
        thumb.title = obj.image_url ? 'Bấm để đổi ảnh' : 'Thêm ảnh cho phân loại (không bắt buộc)';
        if (obj.image_url) {
          thumb.innerHTML = `<img src="${esc(obj.image_url)}" alt="" />`;
        } else {
          thumb.innerHTML = `<span>🖼️</span>`;
        }
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.heic,.heif';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', async () => {
          if (!fileInput.files.length) return;
          thumb.disabled = true;
          try {
            const url = await uploadVariantImage(fileInput.files[0], g.name, obj.value);
            obj.image_url = url;
            renderGroups();
            toast('Đã thêm ảnh cho "' + obj.value + '" ✅ (nhớ bấm Lưu)');
          } catch (e) {
            toast('Lỗi tải ảnh: ' + (e.message || e));
          } finally {
            thumb.disabled = false;
            fileInput.value = '';
          }
        });
        thumb.addEventListener('click', () => fileInput.click());

        const nameSpan = document.createElement('span');
        nameSpan.className = 'var-val-name';
        nameSpan.textContent = obj.value;

        const actions = document.createElement('span');
        actions.className = 'var-val-actions';
        // Nút xóa ảnh (chỉ hiện khi có ảnh)
        if (obj.image_url) {
          const delImg = document.createElement('button');
          delImg.type = 'button';
          delImg.className = 'var-val-delimg';
          delImg.textContent = 'Xóa ảnh';
          delImg.title = 'Xóa ảnh của phân loại này';
          delImg.addEventListener('click', (e) => {
            e.stopPropagation();
            obj.image_url = '';
            renderGroups();
          });
          actions.appendChild(delImg);
        }
        // Nút xóa giá trị
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'var-val-del';
        x.textContent = '×';
        x.title = 'Xóa giá trị';
        x.addEventListener('click', () => { g.values.splice(vi, 1); renderGroups(); renderSkus(); });
        actions.appendChild(x);

        row.appendChild(thumb);
        row.appendChild(fileInput);
        row.appendChild(nameSpan);
        row.appendChild(actions);
        valsWrap.appendChild(row);
      });

      // Ô thêm giá trị mới
      const addWrap = document.createElement('span');
      addWrap.className = 'var-val-add';
      const addInput = document.createElement('input');
      addInput.type = 'text';
      addInput.placeholder = '+ Giá trị (VD: Xanh Dương)';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = '+';
      addBtn.title = 'Thêm giá trị';
      const commitAdd = () => {
        const v = addInput.value.trim();
        if (!v) return;
        if (g.values.some(o => o.value === v)) { toast('Giá trị đã có rồi'); return; }
        g.values.push({ value: v, image_url: '' });
        renderGroups();
        renderSkus();
      };
      addBtn.addEventListener('click', commitAdd);
      addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitAdd(); } });
      addWrap.appendChild(addInput);
      addWrap.appendChild(addBtn);
      valsWrap.appendChild(addWrap);

      card.appendChild(valsWrap);
      wrap.appendChild(card);
    });
    updateVariantUI();
  }

  // v22: có nhóm phân loại thật không? (tên hoặc giá trị đã nhập)
  function hasRealGroups() {
    return vgroups.some(g => (g.name || '').trim() || (g.values || []).some(o => (o.value || '').trim()));
  }
  // v22: có phân loại -> ẩn giá đơn, hiện bảng SKU; chưa có -> ngược lại
  function updateVariantUI() {
    const has = hasRealGroups();
    const simple = $('simple-price-wrap');
    const skuSec = $('sku-section');
    if (simple) simple.style.display = has ? 'none' : '';
    if (skuSec) skuSec.style.display = has ? '' : 'none';
  }

  // v22: chế độ nền tag + preview trực tiếp
  function setTagMode(mode) {
    tagMode = mode;
    $('seg-tag-solid').classList.toggle('active', mode === 'solid');
    $('seg-tag-grad').classList.toggle('active', mode === 'gradient');
    $('f-tag-bg2-wrap').classList.toggle('hidden', mode !== 'gradient');
    updateTagPreview();
  }
  function updateTagPreview() {
    const pv = $('tag-preview');
    if (!pv) return;
    const txt = $('f-tag-text').value.trim() || 'Tag mẫu';
    pv.textContent = txt;
    pv.style.color = $('f-tag-fg').value;
    pv.style.background = tagMode === 'gradient'
      ? `linear-gradient(135deg, ${$('f-tag-bg').value}, ${$('f-tag-bg2').value})`
      : $('f-tag-bg').value;
  }

  // Đọc giá/kho user đã nhập trong bảng SKU vào skuData (giữ lại khi render lại)
  function collectSkuInputs() {
    document.querySelectorAll('#sku-rows .sku-row').forEach(row => {
      const name = row.getAttribute('data-sku');
      const price = parseInt(row.querySelector('[data-p]').value, 10);
      const stock = parseInt(row.querySelector('[data-s]').value, 10);
      skuData[name] = {
        price: !isNaN(price) && price >= 0 ? price : 0,
        stock: !isNaN(stock) && stock >= 0 ? stock : 0
      };
    });
  }

  function renderSkus(preserveInputs = true) {
    if (preserveInputs) collectSkuInputs();
    const box = $('sku-rows');
    box.innerHTML = '';
    const names = genSkuNames();
    if (!names.length) {
      box.innerHTML = '<div class="sku-empty">Thêm ít nhất 1 phân loại có giá trị để sinh bảng giá.</div>';
      return;
    }
    names.forEach(name => {
      const d = skuData[name] || { price: 0, stock: 0 };
      const row = document.createElement('div');
      row.className = 'sku-row';
      row.setAttribute('data-sku', name);
      row.innerHTML = `
        <div class="sku-name">${esc(name)}</div>
        <div class="sku-inputs">
          <div class="f"><label>Giá (đ)</label><input type="number" data-p min="0" step="1000" value="${d.price}" /></div>
          <div class="f"><label>Tồn kho</label><input type="number" data-s min="0" value="${d.stock}" /></div>
        </div>`;
      box.appendChild(row);
    });
  }

  function applyBulk() {
    const p = parseInt($('bulk-price').value, 10);
    const s = parseInt($('bulk-stock').value, 10);
    if ((isNaN(p) || p < 0) && (isNaN(s) || s < 0)) { toast('Nhập giá hoặc tồn kho để áp dụng'); return; }
    collectSkuInputs();
    Object.keys(skuData).forEach(k => {
      if (!isNaN(p) && p >= 0) skuData[k].price = p;
      if (!isNaN(s) && s >= 0) skuData[k].stock = s;
    });
    // Áp dụng cả cho SKU chưa có trong skuData (vừa sinh)
    genSkuNames().forEach(n => {
      if (!skuData[n]) skuData[n] = { price: 0, stock: 0 };
      if (!isNaN(p) && p >= 0) skuData[n].price = p;
      if (!isNaN(s) && s >= 0) skuData[n].stock = s;
    });
    renderSkus(false);
    toast('Đã áp dụng cho tất cả ✅');
  }

  function getSkus() {
    collectSkuInputs();
    return genSkuNames().map((name, i) => ({
      name,
      price: (skuData[name] || {}).price || 0,
      stock: (skuData[name] || {}).stock || 0,
      sort_order: i
    }));
  }
  function renderImagePreviews() {
    const box = $('image-previews');
    box.innerHTML = '';
    imageUrls.forEach((url, i) => {
      const d = document.createElement('div');
      d.className = 'img-thumb' + (i === 0 ? ' is-main' : '');
      d.title = 'Bấm để đặt làm ảnh đại diện';
      d.innerHTML = `
        <img src="${esc(url)}" alt="Ảnh ${i + 1}" />
        <span class="main-tag">Ảnh đại diện</span>
        <button type="button" class="del" title="Xóa ảnh">✕</button>`;
      d.addEventListener('click', () => {
        imageUrls.unshift(imageUrls.splice(i, 1)[0]);
        renderImagePreviews();
      });
      d.querySelector('.del').addEventListener('click', (e) => {
        e.stopPropagation();
        imageUrls.splice(i, 1);
        renderImagePreviews();
      });
      box.appendChild(d);
    });
  }

  async function openEditor(productId) {
    editingId = productId || null;
    $('editor-error').classList.add('hidden');
    $('editor-title').textContent = editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
    $('btn-delete').classList.toggle('hidden', !editingId);
    vgroups = [];
    skuData = {};
    renderGroups();
    renderSkus();
    imageUrls = [];
    renderImagePreviews();

    if (editingId) {
      try {
        const { data, error } = await client
          .from('products')
          .select('*, product_variants(*), variant_groups(*, variant_values(*))')
          .eq('id', editingId)
          .single();
        if (error) throw error;
        $('f-name').value = data.name || '';
        $('f-slug').value = data.id || '';
        $('f-slug').disabled = true; // không đổi mã khi sửa (tránh gãy link ảnh)
        $('f-category').value = data.category || '';
        $('f-desc').value = data.description || '';
        $('f-order').value = data.sort_order || 0;
        $('f-isnew').checked = !!data.is_new;
        $('f-featured').checked = !!data.is_featured;
        // v22: tag tùy chỉnh
        $('f-tag-text').value = data.tag_text || '';
        $('f-tag-fg').value = data.tag_text_color || '#FFFFFF';
        $('f-tag-bg').value = data.tag_bg_color || '#EC4899';
        $('f-tag-bg2').value = data.tag_bg_color2 || '#F59E0B';
        setTagMode(data.tag_bg_color2 ? 'gradient' : 'solid');
        updateTagPreview();
        // v9: dựng lại nhóm phân loại từ DB
        const gs = (data.variant_groups || [])
          .slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (gs.length) {
          vgroups = gs.map(g => ({
            name: g.name || '',
            // v15: mỗi giá trị có thêm ảnh riêng (không bắt buộc)
            values: ((g.variant_values || [])
              .slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map(v => ({ value: v.value, image_url: v.image_url || '' }))).filter(o => o.value)
          })).filter(g => g.values.length);
        }
        // DB cũ (chưa có nhóm): gom các phân loại phẳng thành 1 nhóm "Phân loại"
        const vs = (data.product_variants || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        // v22: chỉ 1 variant "Mặc định" = sản phẩm không phân loại -> dùng giá đơn giản
        const isSimple = !vgroups.length && vs.length === 1 && vs[0].name === 'Mặc định';
        if (isSimple) {
          $('f-simple-price').value = Number(vs[0].price) || '';
          $('f-simple-stock').value = Number(vs[0].stock) || '';
          vgroups = [];
        } else {
          if (!vgroups.length && vs.length) {
            vgroups = [{ name: 'Phân loại', values: vs.map(v => ({ value: v.name, image_url: '' })) }];
          }
          if (!vgroups.length) vgroups = [{ name: '', values: [] }];
        }
        // Giữ lại giá + kho đã lưu theo tên SKU
        vs.forEach(v => {
          skuData[v.name] = { price: Number(v.price) || 0, stock: Number(v.stock) || 0 };
        });
        renderGroups();
        renderSkus(false);
        imageUrls = Array.isArray(data.images) && data.images.length ? data.images.slice()
          : (data.image ? [data.image] : []);
        renderImagePreviews();
      } catch (e) {
        showError($('editor-error'), 'Không tải được sản phẩm: ' + (e.message || e));
        return;
      }
    } else {
      $('f-name').value = '';
      $('f-slug').value = '';
      $('f-slug').disabled = false;
      $('f-category').value = '';
      $('f-desc').value = '';
      $('f-order').value = 0;
      $('f-isnew').checked = false;
      $('f-featured').checked = false;
      // v22: reset tag + giá đơn
      $('f-tag-text').value = '';
      $('f-tag-fg').value = '#FFFFFF';
      $('f-tag-bg').value = '#EC4899';
      $('f-tag-bg2').value = '#F59E0B';
      setTagMode('solid');
      updateTagPreview();
      $('f-simple-price').value = '';
      $('f-simple-stock').value = '';
      vgroups = [{ name: '', values: [] }];
      skuData = {};
      renderGroups();
      renderSkus();
    }
    $('editor-box').classList.remove('hidden');
    $('editor-box').scrollIntoView({ behavior: 'smooth' });
  }
  function closeEditor() {
    $('editor-box').classList.add('hidden');
    editingId = null;
  }

  // Đọc N bytes đầu file, thử arrayBuffer() trước, rớt thì dùng FileReader
  // (một số WebView Android cũ không hỗ trợ blob.arrayBuffer())
  async function readFileHead(file, n) {
    try {
      const buf = await file.slice(0, n).arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) { /* thử cách 2 */ }
    try {
      const buf = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('read-fail'));
        r.readAsArrayBuffer(file.slice(0, n));
      });
      return new Uint8Array(buf);
    } catch (e) { /* bỏ qua */ }
    return new Uint8Array(0);
  }

  // Chuẩn hóa file ảnh trước khi upload (v18: kiểm tra MỌI file, không care đuôi):
  // B0. JPG/PNG/GIF/WebP/BMP đặt nhầm đuôi (vd: HEIC đổi thành .png) -> đổi tên về đúng đuôi
  // B1. HEIC thật (dù đuôi là .heic hay đã bị đổi thành .png/.jpg) -> convert sang JPG:
  //     B2: decode native bằng trình duyệt (Safari mở được HEIC) -> canvas -> JPG
  //     B3: heic2any
  // v20: thu nhỏ ảnh quá khổ trước khi upload để web load nhanh, hết lag
  // (ảnh iPhone 12-48MP -> cạnh dài tối đa 1600px, JPEG 0.85; GIF động giữ nguyên;
  //  thất bại thì giữ file gốc, không chặn upload)
  const MAX_IMG_EDGE = 1600;
  async function downscaleImage(file) {
    try {
      if (!file || !/^image\//.test(file.type || '')) return file;
      if (file.type === 'image/gif') return file;
      const bmp = await createImageBitmap(file);
      const longEdge = Math.max(bmp.width, bmp.height);
      if (longEdge <= MAX_IMG_EDGE) { if (bmp.close) bmp.close(); return file; }
      const scale = MAX_IMG_EDGE / longEdge;
      const w = Math.round(bmp.width * scale);
      const h = Math.round(bmp.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
      if (!blob || !blob.size) return file;
      const base = (file.name || 'anh').replace(/\.[a-z0-9]+$/i, '') || 'anh';
      return new File([blob], base + '.jpg', { type: 'image/jpeg' });
    } catch (e) {
      return file;
    }
  }

  async function normalizeImageFileRaw(file) {
    const name = (file.name || '').toLowerCase();
    const head = await readFileHead(file, 16);
    const isJpeg = head.length >= 3 && head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
    const isPng = head.length >= 4 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
    const isGif = head.length >= 3 && head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46;
    const isWebp = head.length >= 12 && head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
      && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    const isBmp = head.length >= 2 && head[0] === 0x42 && head[1] === 0x4D;
    // HEIC: hộp ftyp + brand heic/heix/hevc/...
    let isHeicData = false;
    if (head.length >= 12 && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
      const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
      isHeicData = /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(brand);
    }
    const isHeicExt = /\.heic$|\.heif$/.test(name);
    const isHeicMime = file.type === 'image/heic' || file.type === 'image/heif';
    const fmt = isJpeg ? 'jpeg' : isPng ? 'png' : isGif ? 'gif' : isWebp ? 'webp' : isBmp ? 'bmp' : null;

    // B0: ảnh web hợp lệ nhưng sai đuôi -> sửa tên cho đúng
    if (fmt && !isHeicData) {
      const ext = fmt === 'jpeg' ? '.jpg' : '.' + fmt;
      const curExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (curExt !== ext) {
        const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'anh';
        return new File([file], base + ext, { type: 'image/' + fmt });
      }
      return file;
    }

    // B1: HEIC thật (bất kể đuôi gì) -> convert sang JPG
    if (isHeicData || isHeicExt || isHeicMime) {
      const jpgName = (file.name.replace(/\.[a-z0-9]+$/i, '') || 'anh') + '.jpg';

      // B2: trình duyệt decode được (kể cả HEIC trên Safari) -> vẽ ra canvas, xuất JPG thật
      try {
        const bmp = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
        if (blob && blob.size > 0) {
          return new File([blob], jpgName, { type: 'image/jpeg' });
        }
        throw new Error('encode-failed');
      } catch (e) { /* qua B2.5 */ }

      // B2.5 (v19): WebCodecs ImageDecoder — dùng codec HEIC có sẵn của hệ điều hành
      // (nhiều máy Android decode được HEIC bằng đường này dù WASM thất bại)
      try {
        if (typeof ImageDecoder === 'undefined') throw new Error('no-webcodecs');
        const decoder = new ImageDecoder({ data: file, type: 'image/heic' });
        const { image } = await decoder.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.displayWidth || image.codedWidth;
        canvas.height = image.displayHeight || image.codedHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        image.close();
        if (typeof decoder.close === 'function') decoder.close();
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
        if (blob && blob.size > 0) {
          return new File([blob], jpgName, { type: 'image/jpeg' });
        }
        throw new Error('encode-failed');
      } catch (e) { /* qua B3: có thể máy này không có codec HEIC */ }

      // B3: convert bằng heic2any (chạy 100% trên trình duyệt)
      try {
        if (typeof heic2any === 'undefined') throw new Error('no-lib');
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        const outBlob = Array.isArray(converted) ? converted[0] : converted;
        return new File([outBlob], jpgName, { type: 'image/jpeg' });
      } catch (e) {
        throw new Error('Ảnh HEIC này không convert được. Bạn gửi file đó cho Muse để mình kiểm tra nhé');
      }
    }

    return file;
  }

  // Wrapper: chuẩn hóa định dạng xong -> thu nhỏ nếu quá khổ
  async function normalizeImageFile(file) {
    const f = await normalizeImageFileRaw(file);
    return downscaleImage(f);
  }

  async function uploadImages(files) {
    if (!files.length) return;
    const slug = slugify($('f-slug').value || $('f-name').value);
    const status = $('upload-status');
    let done = 0;
    for (const rawFile of files) {
      try {
        status.textContent = `Đang tải ảnh ${done + 1}/${files.length}...`;
        const file = await normalizeImageFile(rawFile);
        const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(0, 40);
        const path = `${slug}/${Date.now()}_${cleanName}`;
        const { error } = await client.storage.from('product-images').upload(path, file, {
          cacheControl: '31536000',
          upsert: false
        });
        if (error) throw error;
        const { data } = client.storage.from('product-images').getPublicUrl(path);
        imageUrls.push(data.publicUrl);
        done++;
      } catch (e) {
        toast('Lỗi tải ảnh: ' + (e.message || e));
      }
    }
    status.textContent = done ? `Đã tải lên ${done} ảnh ✅ (nhớ bấm "Lưu sản phẩm")` : '';
    renderImagePreviews();
  }

  // v15: upload 1 ảnh cho giá trị phân loại -> trả về public URL
  async function uploadVariantImage(rawFile, groupName, valueName) {
    const file = await normalizeImageFile(rawFile);
    const slug = slugify($('f-slug').value || $('f-name').value || 'sp');
    const cleanName = (groupName + '-' + valueName).toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').slice(0, 30);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
    const path = `${slug}/variants/${Date.now()}_${cleanName}.${ext}`;
    const { error } = await client.storage.from('product-images').upload(path, file, {
      cacheControl: '31536000',
      upsert: false
    });
    if (error) throw error;
    const { data } = client.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProduct() {
    const errBox = $('editor-error');
    errBox.classList.add('hidden');
    const name = $('f-name').value.trim();
    const category = $('f-category').value.trim();
    const slug = slugify($('f-slug').value || name);
    // v9: chuẩn hóa nhóm phân loại (bỏ nhóm trống)
    const groups = vgroups
      .map(g => ({
        name: (g.name || '').trim(),
        // v15: giữ lại image_url của từng giá trị
        values: g.values
          .map(o => ({ value: (o.value || '').trim(), image_url: o.image_url || '' }))
          .filter(o => o.value)
      }))
      .filter(g => g.name && g.values.length);

    if (!name) return showError(errBox, 'Nhập tên sản phẩm.');
    if (!category) return showError(errBox, 'Nhập danh mục.');
    // v22: phân loại không bắt buộc
    const useSimple = !hasRealGroups();
    let skus = getSkus();
    let simplePrice = 0, simpleStock = 0;
    if (useSimple) {
      simplePrice = parseInt($('f-simple-price').value, 10) || 0;
      simpleStock = parseInt($('f-simple-stock').value, 10) || 0;
      if (!simplePrice) return showError(errBox, 'Nhập giá bán cho sản phẩm.');
      skus = [{ name: 'Mặc định', price: simplePrice, stock: simpleStock, sort_order: 0 }];
    } else if (!skus.length) {
      return showError(errBox, 'Thêm ít nhất 1 giá trị cho phân loại.');
    }

    const btn = $('btn-save');
    btn.disabled = true;
    try {
      const row = {
        id: slug,
        name,
        category,
        description: $('f-desc').value.trim(),
        image: imageUrls[0] || '',
        images: imageUrls,
        is_new: $('f-isnew').checked,
        is_featured: $('f-featured').checked,
        // v22: tag tùy chỉnh (trống = không hiện; có màu nền 2 = gradient)
        tag_text: $('f-tag-text').value.trim(),
        tag_text_color: $('f-tag-fg').value,
        tag_bg_color: $('f-tag-bg').value,
        tag_bg_color2: tagMode === 'gradient' ? $('f-tag-bg2').value : '',
        sort_order: parseInt($('f-order').value, 10) || 0
      };
      if (editingId) {
        const { error } = await client.from('products').update(row).eq('id', editingId);
        if (error) throw error;
        // Xóa dữ liệu phân loại cũ (groups xóa theo cascade -> values)
        const { error: delG } = await client.from('variant_groups').delete().eq('product_id', editingId);
        if (delG) throw delG;
        const { error: delErr } = await client.from('product_variants').delete().eq('product_id', editingId);
        if (delErr) throw delErr;
      } else {
        // Kiểm tra trùng mã
        const { data: exists } = await client.from('products').select('id').eq('id', slug).maybeSingle();
        if (exists) throw new Error(`Mã "${slug}" đã tồn tại. Đổi tên hoặc sửa mã sản phẩm.`);
        const { error } = await client.from('products').insert(row);
        if (error) throw error;
      }
      const targetId = editingId || slug;
      // Lưu nhóm + giá trị
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const { data: gRow, error: gErr } = await client.from('variant_groups')
          .insert({ product_id: targetId, name: g.name, sort_order: gi })
          .select('id').single();
        if (gErr) throw gErr;
        const { error: vErr } = await client.from('variant_values').insert(
          g.values.map((o, vi) => ({ group_id: gRow.id, value: o.value, image_url: o.image_url || null, sort_order: vi }))
        );
        if (vErr) throw vErr;
      }
      // Lưu các tổ hợp SKU (giá + tồn kho)
      const { error: sErr } = await client.from('product_variants').insert(
        skus.map((s) => ({ product_id: targetId, name: s.name, price: s.price, stock: s.stock, sort_order: s.sort_order }))
      );
      if (sErr) throw sErr;
      toast(editingId ? 'Đã lưu thay đổi ✅' : 'Đã thêm sản phẩm ✅');
      closeEditor();
      loadProducts();
    } catch (e) {
      showError(errBox, 'Lưu thất bại: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteProduct() {
    if (!editingId) return;
    if (!confirm(`Xóa hẳn "${$('f-name').value}"? Không thể hoàn tác!`)) return;
    const btn = $('btn-delete');
    btn.disabled = true;
    try {
      const { error } = await client.from('products').delete().eq('id', editingId);
      if (error) throw error;
      toast('Đã xóa sản phẩm 🗑');
      closeEditor();
      loadProducts();
    } catch (e) {
      showError($('editor-error'), 'Xóa thất bại: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Cài đặt chung ----------
  const SETTING_KEYS = [
    'shop_name', 'zalo_number', 'zalo_message_template',
    'hero_badge_tag', 'hero_badge_text', 'hero_headline', 'hero_subheadline',
    'promo_title', 'promo_desc', 'promo_button', 'freeship_text', 'hero_card_title'
  ];

  async function loadSettings() {
    try {
      const { data, error } = await client.from('site_settings').select('key, value');
      if (error) throw error;
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      SETTING_KEYS.forEach(k => {
        const el = $('s-' + k);
        if (el) el.value = map[k] != null ? map[k] : '';
      });
    } catch (e) {
      showError($('settings-error'), 'Không tải được cài đặt: ' + (e.message || e));
    }
  }

  async function saveSettings() {
    const errBox = $('settings-error');
    errBox.classList.add('hidden');
    const btn = $('btn-save-settings');
    btn.disabled = true;
    try {
      for (const k of SETTING_KEYS) {
        const el = $('s-' + k);
        const value = el ? el.value.trim() : '';
        const { error } = await client.from('site_settings').upsert({ key: k, value });
        if (error) throw error;
      }
      toast('Đã lưu cài đặt ✅ Web sẽ cập nhật ngay.');
    } catch (e) {
      showError(errBox, 'Lưu thất bại: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Ảnh thật sản phẩm đã in ----------
  async function loadGallery() {
    const list = $('gallery-list');
    list.innerHTML = '<p class="muted">Đang tải...</p>';
    try {
      const { data, error } = await client
        .from('site_gallery')
        .select('id, image_url')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data.length) {
        list.innerHTML = '<p class="muted">Chưa có ảnh nào. Bấm "Thêm ảnh từ điện thoại" ở trên.</p>';
        return;
      }
      list.innerHTML = '';
      data.forEach((g, i) => {
        const d = document.createElement('div');
        d.className = 'gallery-row';
        d.innerHTML = `
          <img src="${esc(g.image_url)}" alt="Ảnh thật ${i + 1}" />
          <div class="gallery-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-up ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn btn-ghost btn-sm" data-down ${i === data.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn btn-danger btn-sm" data-del>Xóa</button>
          </div>`;
        d.querySelector('[data-up]').addEventListener('click', () => moveGallery(data, i, -1));
        d.querySelector('[data-down]').addEventListener('click', () => moveGallery(data, i, 1));
        d.querySelector('[data-del]').addEventListener('click', async () => {
          if (!confirm('Xóa ảnh này khỏi web?')) return;
          const { error } = await client.from('site_gallery').delete().eq('id', g.id);
          if (error) toast('Xóa thất bại: ' + error.message);
          else { toast('Đã xóa ảnh'); loadGallery(); }
        });
        list.appendChild(d);
      });
    } catch (e) {
      list.innerHTML = `<p class="error">Không tải được: ${esc(e.message || e)}</p>`;
    }
  }

  async function moveGallery(items, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    try {
      // Đổi sort_order của 2 ảnh
      const { error } = await client.from('site_gallery').upsert([
        { id: a.id, image_url: a.image_url, sort_order: j },
        { id: b.id, image_url: b.image_url, sort_order: i }
      ]);
      if (error) throw error;
      loadGallery();
    } catch (e) {
      toast('Đổi thứ tự thất bại: ' + (e.message || e));
    }
  }

  async function uploadGalleryImages(files) {
    if (!files.length) return;
    const status = $('g-upload-status');
    // Lấy sort_order tiếp theo
    let nextOrder = 0;
    try {
      const { data } = await client.from('site_gallery')
        .select('sort_order').order('sort_order', { ascending: false }).limit(1);
      if (data && data.length) nextOrder = (data[0].sort_order || 0) + 1;
    } catch (e) { /* bỏ qua */ }
    let done = 0;
    for (const rawFile of files) {
      try {
        status.textContent = `Đang tải ảnh ${done + 1}/${files.length}...`;
        const file = await normalizeImageFile(rawFile);
        const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(0, 40);
        const path = `gallery/${Date.now()}_${cleanName}`;
        const { error } = await client.storage.from('product-images').upload(path, file, {
          cacheControl: '31536000', upsert: false
        });
        if (error) throw error;
        const { data } = client.storage.from('product-images').getPublicUrl(path);
        const { error: dbErr } = await client.from('site_gallery')
          .insert({ image_url: data.publicUrl, sort_order: nextOrder++ });
        if (dbErr) throw dbErr;
        done++;
      } catch (e) {
        toast('Lỗi tải ảnh: ' + (e.message || e));
      }
    }
    status.textContent = done ? `Đã thêm ${done} ảnh ✅` : '';
    loadGallery();
  }

  // ---------- Khởi động ----------
  function init() {
    if (!hasConfig) {
      $('cfg-warning').classList.remove('hidden');
      $('login-box').classList.remove('hidden');
      $('btn-login').disabled = true;
      return;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    $('btn-login').addEventListener('click', signIn);
    $('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') signIn(); });
    $('btn-logout').addEventListener('click', signOut);
    $('btn-add').addEventListener('click', () => openEditor(null));
    $('btn-reload').addEventListener('click', loadProducts);
    $('btn-cancel').addEventListener('click', closeEditor);
    $('btn-save').addEventListener('click', saveProduct);
    $('btn-delete').addEventListener('click', deleteProduct);
    $('btn-add-vgroup').addEventListener('click', () => {
      vgroups.push({ name: '', values: [] });
      renderGroups();
      renderSkus();
    });
    // v22: tag tùy chỉnh — chế độ nền + preview trực tiếp
    $('seg-tag-solid').addEventListener('click', () => setTagMode('solid'));
    $('seg-tag-grad').addEventListener('click', () => setTagMode('gradient'));
    ['f-tag-text', 'f-tag-fg', 'f-tag-bg', 'f-tag-bg2'].forEach(id => {
      $(id).addEventListener('input', updateTagPreview);
    });
    $('btn-bulk-apply').addEventListener('click', applyBulk);
    $('f-name').addEventListener('input', (e) => {
      if (!editingId) $('f-slug').value = slugify(e.target.value);
    });
    $('f-images').addEventListener('change', (e) => {
      uploadImages([...e.target.files]);
      e.target.value = '';
    });

    document.querySelectorAll('.tab-btn').forEach(b =>
      b.addEventListener('click', () => switchTab(b.getAttribute('data-tab'))));
    $('btn-save-settings').addEventListener('click', saveSettings);
    $('g-images').addEventListener('change', (e) => {
      uploadGalleryImages([...e.target.files]);
      e.target.value = '';
    });

    client.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    client.auth.getSession().then(({ data }) => {
      const on = !!(data && data.session);
      setLoggedIn(on);
      if (!on) $('login-box').classList.remove('hidden');
    }).catch(() => {
      $('login-box').classList.remove('hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
