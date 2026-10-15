/**
 * ============================================================================
 * HƯỚNG DẪN THÊM SẢN PHẨM MỚI DÀNH CHO CHỦ SHOP (PRODUCT SCHEMA GUIDE)
 * ============================================================================
 * Để thêm một sản phẩm mới, bạn chỉ cần sao chép (copy) một khối mã mẫu bên dưới,
 * dán vào danh sách PRODUCTS và chỉnh sửa thông tin của bạn:
 *
 * {
 *   id: "ten-san-pham-khong-dau",         // Mã định danh duy nhất (viết liền không dấu)
 *   name: "Tên Sản Phẩm In 3D Của Bạn",   // Tên sản phẩm hiển thị trên website
 *   category: "Móc khóa & Phụ kiện",      // Tên danh mục (hệ thống tự tạo bộ lọc theo danh mục này)
 *   description: "Mô tả chất liệu in...", // Mô tả chi tiết chất liệu, công dụng, kích thước
 *   image: "images/product-ten-anh.svg",  // Đường dẫn ảnh (dễ dàng đổi thành ảnh .jpg, .png thật)
 *   material: "Nhựa PLA sinh học cao cấp", // Chất liệu in 3D
 *   printTime: "2 - 4 giờ hoàn thiện",     // Thời gian in & xử lý bề mặt
 *   variants: [                           // Các phân loại (màu sắc/kích cỡ) kèm giá tiền tương ứng
 *     { name: "Phân loại A", price: 45000 },
 *     { name: "Phân loại B", price: 55000 }
 *   ],
 *   isNew: true                           // true nếu là hàng mới về, false nếu bình thường
 * }
 * ============================================================================
 */

const PRODUCTS = [
  // Danh sách mẫu đã được xóa theo yêu cầu chủ shop (15/10).
  // Web đang đọc sản phẩm từ database Supabase (xem config.js).
  // Mảng này chỉ dùng dự phòng khi chưa cấu hình Supabase.
];

// Đảm bảo PRODUCTS luôn khả dụng trên window
if (typeof window !== 'undefined') {
  window.PRODUCTS = PRODUCTS;
}
