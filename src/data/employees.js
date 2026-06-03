// ─────────────────────────────────────────────────────────
// Employee master data — shared by StockScan & AssetAudit
// ─────────────────────────────────────────────────────────

export const EMP_IMG = {
  "OD1158037":"webp","OD1158048":"webp","OD1159070":"webp","OD1159216":"webp",
  "OD1159220":"webp","OD1159247":"webp","OD1159279":"webp","OD1160081":"webp",
  "OD1160082":"webp","OD1160088":"webp","OD1160351":"webp","OD1160406":"webp",
  "OD1161069":"webp","OD1161078":"webp","OD1161079":"webp","OD1161092":"webp",
  "OD1161125":"webp","OD1161134":"webp","OD1161280":"webp","OD1161363":"webp",
  "OD1161392":"webp","OD1162007":"webp","OD1162045":"webp","OD1162099":"webp",
  "OD1162130":"webp","OD1162131":"webp","OD1162151":"webp","OD1162154":"webp",
  "OD1162203":"webp","OD1162404":"webp","OD1162769":"webp","OD1165002":"webp",
  "OD1165005":"webp","OD1165007":"webp","OD1166001":"webp","OD1167009":"webp",
  "OD1169007":"webp","20085":"webp","671166":"webp",
};

const EMP_RAW = [
  { id:"OD1158037", name:"นายพฤตินัย ล่ำสูง (กอล์ฟ)",             nameEn:"Mr. Pruktinail Lamsoong",            pos:"ผู้ช่วยผู้อำนวยการ",                        phone:"081 937 6638", email:"pruktinail@inet.co.th" },
  { id:"OD1161092", name:"นายธีรวัฒน์ ถินคำเชิด (ธีร์)",           nameEn:"Mr. Teerawat Thinkamcherd",          pos:"รองผู้จัดการ",                              phone:"061 417 4979", email:"teerawat.th@inet.co.th" },
  { id:"OD1159070", name:"นายขจรศักดิ์ ทับสน (พัท)",               nameEn:"Mr. Kajornsak Thupson",              pos:"วิศวกรไฟฟ้า",                               phone:"063 217 3464", email:"kajornsak.th@inet.co.th" },
  { id:"OD1159220", name:"นายกฤษณพงศ์ เขียวกลาง (ไกด์)",           nameEn:"Mr. Kritsanapong Khiaowklang",       pos:"วิศวกรไฟฟ้า",                               phone:"061 387 5338", email:"kritsanapong.kh@inet.co.th" },
  { id:"OD1159247", name:"นายอดิศร ผลรักษ์ (หนุ่ม)",               nameEn:"Mr. Adison Pholrak",                 pos:"วิศวกรไฟฟ้า",                               phone:"063 217 6173", email:"adison.ph@inet.co.th" },
  { id:"OD1161125", name:"นายศุภชัย ช่วยสุข (แบงค์)",              nameEn:"Mr. Supachai Chouysok",              pos:"วิศวกรไฟฟ้า",                               phone:"063 268 8029", email:"supachai.ch@inet.co.th" },
  { id:"OD1162007", name:"นายอาทิตย์ โชติปรีดาเศรษฐ์ (แบงค์)",    nameEn:"Mr. Athit Chotpreedaset",            pos:"วิศวกรไฟฟ้า",                               phone:"065 527 2090", email:"athit.ma@inet.co.th" },
  { id:"OD1166001", name:"นายพุฒิพงษ์ แก่นจันทร์ (เบนซ์)",         nameEn:"Mr. Puthipong Kaenjan",              pos:"วิศวกรไฟฟ้า",                               phone:"063 219 1172", email:"puthipong.ka@inet.co.th" },
  { id:"OD1160082", name:"นายปิติพงษ์ ราชพิลา (อ๊อฟ)",             nameEn:"Mr. Pitipong Rachpila",              pos:"วิศวกรคอมพิวเตอร์",                         phone:"063 204 9800", email:"pitipong.ra@inet.co.th" },
  { id:"OD1158048", name:"ว่าที่ร้อยตรีวีรศักดิ์ แปลลา (วี)",      nameEn:"Acting Sub Lt. Werasak Plaela",      pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"092 262 0118", email:"werasakp@inet.co.th" },
  { id:"OD1159216", name:"นายนิพล พรมน้ำ (ทู)",                    nameEn:"Mr. Nipon Promnarm",                 pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"092 261 4054", email:"nipon.pr@inet.co.th" },
  { id:"OD1159279", name:"นายชัยชนะ บุญสุข (นิค)",                 nameEn:"Mr. Chaichana Bunsuk",               pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 204 9765", email:"chaichana.bu@inet.co.th" },
  { id:"OD1160081", name:"นายกฤษณะ เรืองโหรา (นุ๊ก)",              nameEn:"Mr. Kritsana Rueanghora",            pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 204 9799", email:"kritsana.ru@inet.co.th" },
  { id:"OD1160088", name:"นายสุพจน์ ไทรไกรกระ (ตั้ม)",             nameEn:"Mr. Suphot Thaikaikra",              pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 204 9801", email:"suphot.th@inet.co.th" },
  { id:"OD1160351", name:"นางสาวจงกล แก้วมาลา (นิว)",              nameEn:"Ms. Jongkon Kaewmala",               pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 521 4469", email:"jongkon.ka@inet.co.th" },
  { id:"OD1160406", name:"นายเอกรัตน์ ยอดด่านกลาง (แซม)",          nameEn:"Mr. Ekkarat Yoddanklang",            pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 725 7455", email:"ekkarat.yo@inet.co.th" },
  { id:"OD1161069", name:"นายวิชญ์ภาส สืบพงศ์ (หมอก)",             nameEn:"Mr. Witchaphat Suepphong",           pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"061 410 3453", email:"witchaphat.su@inet.co.th" },
  { id:"OD1161078", name:"นายพีรพัฒน์ โพธิ์จิตร (อั๋น)",           nameEn:"Mr. Peerapat Phochit",               pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"061 410 6213", email:"peerapat.ph@inet.co.th" },
  { id:"OD1161079", name:"นายนัทธพงศ์ ชมภูเจริญ (แนน)",            nameEn:"Mr. Nuttapong Chompucharoen",        pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 268 6703", email:"nuttapong.ch@inet.co.th" },
  { id:"OD1161134", name:"นายพิชิตพนธ์ สิมมา (นก)",                nameEn:"Mr. Pichitpon Simma",                pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"098 280 7256", email:"pichitpon.si@inet.co.th" },
  { id:"OD1161280", name:"นางสาวณัฐชยา พรรณโณภาศ (คุกกี้)",        nameEn:"Ms. Natchaya Pannopas",              pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 197 8503", email:"natchaya.pa@inet.co.th" },
  { id:"OD1161363", name:"นายอภิสิทธิ์ จำมั่น (แมท)",              nameEn:"Mr. Apisit Jummun",                  pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 512 4657", email:"apisit.ju@inet.co.th" },
  { id:"OD1161392", name:"นายชินวัฒน์ แสงบุญเรือง (แชมป์)",        nameEn:"Mr. Chinnawat Saengbunrueang",       pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"092 250 6903", email:"chinnawat.sa@inet.co.th" },
  { id:"OD1162045", name:"นายธนพงษ์ แก้วปัดชา (ตุ่ม)",             nameEn:"Mr. Thanapong Kaewpatcha",           pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 513 4096", email:"thanapong.ka@inet.co.th" },
  { id:"OD1162099", name:"นายศักดิ์ชัย เกตกลางดอน (มนต์)",         nameEn:"Mr. Sakchai Ketklangdon",            pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 504 8320", email:"sakchai.ke@inet.co.th" },
  { id:"OD1162130", name:"นายพศพล ย้อยจันทึก (เปิ้ล)",             nameEn:"Mr. Possapol Yoichanthuek",          pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 512 4631", email:"possapol.yo@inet.co.th" },
  { id:"OD1162131", name:"นายพิชิต แท่งทอง (แจ็ค)",                nameEn:"Mr. Pichit Tangtong",                pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 507 5538", email:"pichit.ta@inet.co.th" },
  { id:"OD1162154", name:"นายสมคิด เกษสุริยงค์ (คิด)",             nameEn:"Mr. Somkid Katesuiyong",             pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 527 1971", email:"somkid.ka@inet.co.th" },
  { id:"OD1162203", name:"นางสาวกัญญาภัค กิจนาค (สตางค์)",         nameEn:"Ms. Kanyapak Kidnark",               pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 527 2503", email:"kanyapak.ki@inet.co.th" },
  { id:"OD1162769", name:"นายพงศธร ศรีสวัสดิ์โชคชัย (แบงค์)",      nameEn:"Mr. Pongsatorn Srisawatchokchai",    pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"063 217 6123", email:"pongsatorn.sr@inet.co.th" },
  { id:"OD1165005", name:"นายนภัส กาษร (ปอ)",                      nameEn:"Mr. Naphat Kasorn",                  pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"092 250 6379", email:"naphat.ka@inet.co.th" },
  { id:"OD1165007", name:"นายสุวัฒน์ อุ่นสุข (บอส)",               nameEn:"Mr. Suwat Oonsuk",                   pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 937 7191", email:"suwat.oo@inet.co.th" },
  { id:"OD1167009", name:"นายธนพร แก้วปัดชา (ตาม)",                nameEn:"Mr. Thanaporn Kaewpadcha",           pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"065 527 2021", email:"thanaporn.ka@inet.co.th" },
  { id:"OD1169007", name:"นายกิตตินันท์ มณีวงษ์ (ฟลุ๊ค)",          nameEn:"Mr. Kittinun Maneewong",             pos:"เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์",   phone:"093 124 1271", email:"kittinun.ma@inet.co.th" },
  { id:"OD1162404", name:"นางสาวรัตติยากร เงินแก้ว (เอ้)",          nameEn:"Ms. Rattiyakorn Nguenkaew",          pos:"เจ้าหน้าที่ขุมชนสัมพันธ์",                 phone:"065 523 1713", email:"rattiyakorn.ng@inet.co.th" },
  { id:"OD1165002", name:"นางสาวชนนิกานต์ วงพิมล (กีฟ)",           nameEn:"Ms. Chonnikarn Wongphimol",          pos:"เจ้าหน้าที่ขุมชนสัมพันธ์",                 phone:"061 398 7469", email:"chonnikarn.wo@inet.co.th" },
  { id:"OD1162151", name:"นายอิทธิพล พันธุ์ชื่น (มอส)",             nameEn:"Mr. Ittiphon Phunchuen",             pos:"ช่างซ่อมบำรุงอาคาร",                       phone:"065 527 1964", email:"ittiphon.ph@inet.co.th" },
  { id:"20085",     name:"นางสาวดาราณีรัตน์ สิทธิพรม (อ้อม)",       nameEn:"Ms. Daraneerat Sittiprom",           pos:"เจ้าหน้าที่บริหารสำนักงาน",                phone:"063 204 9803", email:"daraneerat.si@inet.co.th" },
  { id:"671166",    name:"นางสาวสุภาภรณ์ วิจิตหงษ์ (ปลา)",          nameEn:"Ms. Supaphorn Vijithong",            pos:"เจ้าหน้าที่ความปลอดภัยวิชาชีพ",            phone:"061 025 5514", email:"supaphorn.vi@inet.co.th" },
];

/** Derive display name, initials, and image path from raw record */
function buildEmployee(e) {
  const enName = (e.nameEn || e.name)
    .replace(/^(Mr\.|Ms\.|Mrs\.|Acting Sub Lt\.)\s*/i, '')
    .trim();
  const parts   = enName.split(' ');
  const thName  = e.name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี)\s*/, '')
    .trim();

  return {
    ...e,
    img:         EMP_IMG[e.id] ? `images/${e.id}.${EMP_IMG[e.id]}` : null,
    displayName: thName,
    initials:    (parts[0]?.[0] || '?') + (parts[1]?.[0] || ''),
  };
}

export const EMPLOYEES = EMP_RAW.map(buildEmployee);

/** All valid employee IDs (for portal login validation) */
export const EMP_IDS = EMPLOYEES.map(e => e.id);
