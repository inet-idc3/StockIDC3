/* ตั้งค่า Face Rack — แก้ 2 บรรทัดนี้ให้เป็น URL ของ Web App (ลงท้าย /exec) */
window.RACK_CONFIG = {
  // GAS Rack Phase 2 (Google Sheet "IDC3 Face Rack DB" ของ Phase 2) — ใส่ URL ลงท้าย /exec หรือตั้ง VITE_RACK2_GAS_URL ใน .env ของ Portal
  RACK_GAS_URL: '',
  // GAS Stock (โปรเจกต์เดิม) — ใช้เฉพาะตอนเปิดหน้านี้เดี่ยว ๆ แล้วต้องเข้าสู่ระบบเอง
  // (ถ้าเปิดผ่าน Portal บนโดเมนเดียวกัน จะใช้ session ของ Portal อัตโนมัติ ไม่ต้องกรอก)
  STOCK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxTj90SIFlGbSjpOZ1HtIpnlMQbtTPl1FurzAixCQrfr4nfklK4MgEjfqQSYPJjvguCAg/exec'
};
