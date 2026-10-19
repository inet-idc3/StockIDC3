/* ตั้งค่า Face Rack — แก้ 2 บรรทัดนี้ให้เป็น URL ของ Web App (ลงท้าย /exec) */
window.RACK_CONFIG = {
  // GAS Rack (โปรเจกต์ใหม่) — บังคับ
  RACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbzS60fGBKgye4kchm7pApICSnm3uqqcM36p_f6HEMOsxJgKVksfIMIiv_lJKZPraztY/exec',
  // GAS Stock (โปรเจกต์เดิม) — ใช้เฉพาะตอนเปิดหน้านี้เดี่ยว ๆ แล้วต้องเข้าสู่ระบบเอง
  // (ถ้าเปิดผ่าน Portal บนโดเมนเดียวกัน จะใช้ session ของ Portal อัตโนมัติ ไม่ต้องกรอก)
  STOCK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxTj90SIFlGbSjpOZ1HtIpnlMQbtTPl1FurzAixCQrfr4nfklK4MgEjfqQSYPJjvguCAg/exec'
};
