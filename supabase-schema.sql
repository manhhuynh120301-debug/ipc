-- ============================================================================
-- SUPABASE SCHEMA cho web "Tiệm In Flop"
-- Cách dùng: vào Supabase Dashboard → SQL Editor → New query → dán toàn bộ
-- file này → bấm Run. Chạy 1 lần duy nhất.
-- ============================================================================

-- 1. Bảng sản phẩm ------------------------------------------------------------
create table if not exists products (
  id text primary key,                       -- mã slug, vd: "moc-khoa-non-la-mini"
  name text not null,                        -- tên sản phẩm
  category text not null,                    -- danh mục (web tự tạo bộ lọc)
  description text default '',               -- mô tả chi tiết
  image text default '',                     -- ảnh đại diện (URL)
  images text[] default '{}',                -- các ảnh gallery (URL)
  is_new boolean default false,              -- true = gắn nhãn "Mới"
  is_featured boolean default false,         -- true = ghim + tag "Nổi bật"
  tag_text text default '',                  -- v22: tag tùy chỉnh (trống = không hiện)
  tag_text_color text default '#FFFFFF',     -- v22: màu chữ của tag
  tag_bg_color text default '#EC4899',       -- v22: màu nền của tag (đơn sắc)
  tag_bg_color2 text default '',             -- v22: màu nền 2 (có giá trị = nền gradient)
  sort_order integer default 0,              -- số càng nhỏ hiện càng trước
  created_at timestamptz default now()
);

-- 2. Bảng phân loại + giá -----------------------------------------------------
-- v9: mỗi tổ hợp SKU là 1 dòng (name = "Xanh Dương, 7 màu"), thêm cột tồn kho
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  name text not null,                        -- vd: "Đỏ sao vàng", "Xanh Dương, 7 màu"
  price integer not null,                    -- giá VNĐ, vd: 39000
  stock integer not null default 0,          -- tồn kho (v9)
  sort_order integer default 0
);
create index if not exists idx_variants_product on product_variants(product_id);
-- Nâng cấp DB cũ (v8 trở về trước) lên v9: thêm cột stock nếu chưa có
alter table product_variants add column if not exists stock integer not null default 0;

-- 2b. Nhóm phân loại kiểu Shopee (v9): "Màu sắc" -> ["Xanh Dương", "Xanh lá"...]
create table if not exists variant_groups (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  name text not null,                        -- tên nhóm: "Màu sắc", "Loại đèn"
  sort_order integer default 0
);
create index if not exists idx_vgroups_product on variant_groups(product_id);

create table if not exists variant_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references variant_groups(id) on delete cascade,
  value text not null,                       -- giá trị: "Xanh Dương", "7 màu"
  image_url text,                            -- v15: ảnh thật của phân loại (không bắt buộc)
  sort_order integer default 0
);
create index if not exists idx_vvalues_group on variant_values(group_id);
-- v15: thêm cột image_url cho DB đã tạo từ bản cũ (chạy lại an toàn)
alter table variant_values add column if not exists image_url text;

-- 3. Phân quyền: ai cũng XEM được, chỉ tài khoản đăng nhập mới SỬA được ------
alter table products enable row level security;
alter table product_variants enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products"
  on products for select using (true);

drop policy if exists "public read variants" on product_variants;
create policy "public read variants"
  on product_variants for select using (true);

drop policy if exists "auth write products" on products;
create policy "auth write products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "auth write variants" on product_variants;
create policy "auth write variants"
  on product_variants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table variant_groups enable row level security;
alter table variant_values enable row level security;

drop policy if exists "public read vgroups" on variant_groups;
create policy "public read vgroups"
  on variant_groups for select using (true);

drop policy if exists "auth write vgroups" on variant_groups;
create policy "auth write vgroups"
  on variant_groups for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "public read vvalues" on variant_values;
create policy "public read vvalues"
  on variant_values for select using (true);

drop policy if exists "auth write vvalues" on variant_values;
create policy "auth write vvalues"
  on variant_values for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 4. Kho chứa ảnh sản phẩm (Storage bucket, public để web đọc được) -----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
create policy "public read images"
  on storage.objects for select using (bucket_id = 'product-images');

drop policy if exists "auth upload images" on storage.objects;
create policy "auth upload images"
  on storage.objects for insert with check (bucket_id = 'product-images');

drop policy if exists "auth update images" on storage.objects;
create policy "auth update images"
  on storage.objects for update using (bucket_id = 'product-images');

drop policy if exists "auth delete images" on storage.objects;
create policy "auth delete images"
  on storage.objects for delete using (bucket_id = 'product-images');

-- ============================================================================
-- 5. CÀI ĐẶT CHUNG CỦA WEB (key-value) — chỉnh trong tab "Cài đặt" của admin
--    Chạy lại file này bao nhiêu lần cũng an toàn (không mất dữ liệu cũ).
-- ============================================================================
create table if not exists site_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);

alter table site_settings enable row level security;

drop policy if exists "public read settings" on site_settings;
create policy "public read settings"
  on site_settings for select using (true);

drop policy if exists "auth write settings" on site_settings;
create policy "auth write settings"
  on site_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Giá trị mặc định (chỉ chèn khi chưa có, không ghi đè cái đã sửa)
insert into site_settings (key, value) values
  ('shop_name', 'Tiệm In Flop'),
  ('zalo_number', '0123456789'),
  ('zalo_message_template', 'Chào shop, mình muốn mua {product_name} - {variant_name} - {price}'),
  ('hero_badge_tag', 'Có gì mới'),
  ('hero_badge_text', 'Mới: nhận in móc khóa theo tên riêng & màu sắc tùy chọn!
Nhận in 3D theo yêu cầu — gửi mẫu là có báo giá ngay
Kiểm tra kỹ từng sản phẩm trước khi giao'),
  ('hero_headline', 'Đồ in 3D bạn thích.'),
  ('hero_subheadline', 'Chọn mẫu, nhắn Zalo là có hàng.'),
  ('promo_title', 'Tư vấn & Đặt in 3D theo yêu cầu'),
  ('promo_desc', 'Hỗ trợ dựng file 3D, chọn vật liệu PLA/Resin sắc nét và báo giá nhanh qua Zalo!'),
  ('promo_button', 'Nhận tư vấn ngay')
on conflict (key) do nothing;

-- ============================================================================
-- 6. ẢNH THẬT SẢN PHẨM ĐÃ IN (khu vuốt thẻ) — thêm/xóa trong tab "Ảnh thật"
-- ============================================================================
create table if not exists site_gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_gallery_order on site_gallery(sort_order, created_at);

alter table site_gallery enable row level security;

drop policy if exists "public read gallery" on site_gallery;
create policy "public read gallery"
  on site_gallery for select using (true);

drop policy if exists "auth write gallery" on site_gallery;
create policy "auth write gallery"
  on site_gallery for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- 7. GHIM SẢN PHẨM NỔI BẬT (v6) — bật/tắt trong trang admin, sản phẩm được
--    ghim sẽ lên đầu danh sách kèm tag "Nổi bật"
-- ============================================================================
alter table products add column if not exists is_featured boolean default false;

-- v22: tag tùy chỉnh (tên + màu chữ + màu nền, hiệu ứng nhấp nháy như tag Nổi bật)
alter table products add column if not exists tag_text text default '';
alter table products add column if not exists tag_text_color text default '#FFFFFF';
alter table products add column if not exists tag_bg_color text default '#EC4899';
alter table products add column if not exists tag_bg_color2 text default '';
