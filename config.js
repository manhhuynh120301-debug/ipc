/**
 * CẤU HÌNH THÔNG TIN SHOP (SHOP CONFIGURATION)
 * ====================================================================
 * Đây là file DUY NHẤT chủ shop cần chỉnh sửa khi thay đổi thông tin cửa hàng.
 * Tất cả thông tin khác trên website sẽ tự động cập nhật theo file này.
 * ====================================================================
 */

const CONFIG = {
  // 1. Tên cửa hàng hiển thị trên Header, Footer và Title trang
  SHOP_NAME: "Tiệm In Flop",

  // 2. Số điện thoại Zalo nhận tin nhắn đặt hàng của chủ shop
  // Lưu ý: Nhập số điện thoại thật của bạn (VD: "0987654321").
  // Nếu giữ nguyên giá trị mẫu "0123456789" hoặc "YOUR_ZALO_NUMBER", 
  // hệ thống sẽ tự động hiển thị hộp thoại xem trước tin nhắn mẫu thay vì chuyển sang Zalo.
  ZALO_NUMBER: "0123456789",

  // 3. Mẫu tin nhắn gửi qua Zalo
  // Các biến tự động thay thế:
  //   - {product_name}: Tên sản phẩm khách chọn
  //   - {variant_name}: Tên phân loại (màu sắc/kích thước)
  //   - {price}: Giá tiền tương ứng với phân loại đã chọn
  ZALO_MESSAGE_TEMPLATE: "Chào shop, mình muốn mua {product_name} - {variant_name} - {price}",

  // 4. KẾT NỐI SUPABASE (DATABASE) — để thêm/sửa sản phẩm trên trang /admin
  // --------------------------------------------------------------------
  // Nếu để trống 2 dòng dưới, web dùng dữ liệu mẫu trong file products.js.
  // Sau khi tạo project miễn phí tại https://supabase.com, dán vào đây:
  //   - SUPABASE_URL: Project URL (VD: "https://abcxyz.supabase.co")
  //   - SUPABASE_ANON_KEY: anon public key (nút "anon public" trong API Settings)
  // Key anon là key CÔNG KHAI, nằm trong code web là bình thường và an toàn
  // vì quyền ghi đã được khóa bằng RLS (chỉ tài khoản đăng nhập mới sửa được).
  SUPABASE_URL: "https://atrtupehvpeszjyhwxth.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_eWhwjSb8UKZAexcX8GepcA_bEfXojWx"
};

// Đảm bảo truy cập được ở mọi môi trường trình duyệt
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
