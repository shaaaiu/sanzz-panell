// ====================================================================
// Variabel Global, Helper, dan Konfigurasi API
// ====================================================================
const global = {
  domain: "https://mikudevprivate.pteropanelku.biz.id",
  apikey: "ptla_7gss1IvRmWISvixYyZ4fEQgPD6wLvakmAeZMyoT9HFQ",
  nestid: "5",
  egg: "15",
  loc: "1",
  qrisOrderKuota: "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214520146378043870303UMI51440014ID.CO.QRIS.WWW0215ID20243618270230303UMI5204541153033605802ID5919STOK RESS OK21423066007CILEGON61054241162070703A016304F736",
  apiSimpelBot: "new2025",
  apikeyorkut: "https://simpelz.fahriofficial.my.id",
  merchantIdOrderKuota: "OK2142306",
  apiOrderKuota: "700336617360840832142306OKCT7A1A4292BE20CEF492B467C5B6EAC103",
};

let timeout, interval;

function $(id) {
  return document.getElementById(id);
}

function toIDR(value) {
  return Number(value).toLocaleString("id-ID");
}

function getRandomFee(min = 100, max = 500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// FUNGSI getSpecByCmd DIHAPUS
// ---

// ====================================================================
// Fungsi Utama Transaksi & Pembayaran
// ====================================================================

// Menggantikan fungsi buatQris() dan buatPembayaran() yang asli
async function buatPembayaran() {
  const pilihan = $("ram").value; // Menggunakan ID 'ram' dari kode kedua
  const username = $("username").value.trim();
  
  if (!pilihan || !username) return alert("Harap isi username dan pilih RAM!");

  // --- LOGIKA PENENTUAN SPESIFIKASI (MENGGANTIKAN getSpecByCmd) ---
  let Obj; 
  switch (pilihan) {
    case "1gb":
      Obj = { ram: "1000", disk: "1000", cpu: "40", harga: "10" };
      break;
    case "2gb":
      Obj = { ram: "2000", disk: "1000", cpu: "60", harga: "20" };
      break;
    case "3gb":
      Obj = { ram: "3000", disk: "2000", cpu: "80", harga: "30" };
      break;
    case "4gb":
      Obj = { ram: "4000", disk: "2000", cpu: "100", harga: "40" };
      break;
    case "5gb":
      Obj = { ram: "5000", disk: "3000", cpu: "120", harga: "50" };
      break;
    case "6gb":
      Obj = { ram: "6000", disk: "3000", cpu: "140", harga: "60" };
      break;
    case "7gb":
      Obj = { ram: "7000", disk: "4000", cpu: "160", harga: "70" };
      break;
    case "8gb":
      Obj = { ram: "8000", disk: "4000", cpu: "180", harga: "80" };
      break;
    case "9gb":
      Obj = { ram: "9000", disk: "5000", cpu: "200", harga: "90" };
      break;
    case "10gb":
      Obj = { ram: "10000", disk: "5000", cpu: "220", harga: "100" };
      break;
    case "unli":
    case "unlimited":
      Obj = { ram: "0", disk: "0", cpu: "0", harga: "150" };
      break;
    default:
      return alert("Pilihan RAM tidak valid!");
  }
  // -------------------------------------------------------------------

  const loadingText = $("loadingText");
  const qrisSection = $("qrisSection"); // Menggunakan ID 'qrisSection' (dulu infoPembayaran)
  const btnBatal = $("btnBatal");

  // Tampilkan loading
  loadingText.classList.remove("hidden");

  const fee = getRandomFee();
  const amount = parseInt(Obj.harga) + fee;

  try {
    const res = await fetch(
      `${global.apikeyorkut}/api/orkut/createpayment?apikey=${global.apiSimpelBot}&amount=${amount}&codeqr=${global.qrisOrderKuota}`
    );
    const data = await res.json();
    const result = data.result;
    
    if (!result || !result.transactionId) throw new Error("Gagal membuat QRIS: " + JSON.stringify(data));

    // Sembunyikan loading, tampilkan section QRIS & tombol batal
    loadingText.classList.add("hidden");
    qrisSection.classList.remove("hidden");
    btnBatal.classList.remove("hidden");

    // Set gambar QRIS
    $("qrisImage").src = result.qrImageUrl; // Menggunakan ID 'qrisImage' (dulu qrImage)

    // Tampilkan detail pembayaran
    $("detailPembayaran").textContent = 
`乂 INFORMASI PEMBAYARAN

• ID : ${result.transactionId}
• Username : ${username}
• RAM : ${pilihan}
• Expired : 5 menit

• Harga Asli : Rp${toIDR(Obj.harga)}
• Biaya Admin : Rp${toIDR(fee)}
• Total Pembayaran : Rp${toIDR(result.amount)}

Note : QRIS hanya berlaku selama 5 menit.`;

    // Simpan riwayat transaksi
    const riwayatData = {
      id: result.transactionId,
      username: username,
      paket: pilihan,
      waktu: new Date().toLocaleString("id-ID"),
      harga: result.amount
    };
    simpanRiwayat(riwayatData);

    // Atur timeout dan interval untuk cek status
    clearTimeout(timeout);
    clearInterval(interval);

    timeout = setTimeout(() => {
      alert("QRIS Pembayaran telah expired! Silakan buat transaksi baru.");
      batalQris();
    }, 5 * 60 * 1000); // 5 menit

    interval = setInterval(async () => {
      const cek = await fetch(
        `${global.apikeyorkut}/api/orkut/cekstatus?apikey=${global.apiSimpelBot}&merchant=${global.merchantIdOrderKuota}&keyorkut=${global.apiOrderKuota}`
      );
      const json = await cek.json();

      // Asumsi: Cek jika jumlah yang dibayarkan cocok dan status sukses
      if (parseInt(json?.amount) === result.amount && json?.status === "success") { 
        clearInterval(interval);
        clearTimeout(timeout);
        await buatAkunDanServer(username, Obj);
      }
    }, 8000); // Cek setiap 8 detik
  } catch (error) {
    loadingText.classList.add("hidden");
    console.error(error);
    alert("Terjadi kesalahan saat memproses pembayaran: " + error.message);
  }
}

// Batalkan pembayaran: sembunyikan & hapus QRIS dan hentikan pengecekan
function batalQris() {
  const qrisSection = $("qrisSection");
  const qrisImg = $("qrisImage");
  const detail = $("detailPembayaran");
  const btnBatal = $("btnBatal");

  qrisSection.classList.add("hidden");
  btnBatal.classList.add("hidden");
  if (qrisImg) qrisImg.src = "";
  if (detail) detail.textContent = "";

  // Hentikan interval/timeout
  clearInterval(interval);
  clearTimeout(timeout);
}


async function buatAkunDanServer(username, Obj) {
  const email = `${username}@gmail.com`;
  const name = `${username.charAt(0).toUpperCase() + username.slice(1)} Server`;
  const password = `${username}${Math.floor(Math.random() * 10000)}`;

  try {
    // 1. Buat User Panel
    const buatUser = await fetch("/api/proxy?route=users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.apikey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        email,
        username: username.toLowerCase(),
        first_name: name.split(" ")[0],
        last_name: "Server",
        language: "en",
        password
      })
    });

    const user = await buatUser.json();
    if (user.errors) return alert("Gagal buat akun panel:\n" + JSON.stringify(user.errors[0] || user));

    const userId = user.attributes.id;

    // 2. Ambil Info Egg (untuk startup command)
    const eggInfo = await fetch(`${global.domain}/api/application/nests/${global.nestid}/eggs/${global.egg}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${global.apikey}`
      }
    });

    const egg = await eggInfo.json();
    const startup_cmd = egg.attributes.startup;

    // 3. Buat Server
    const buatServer = await fetch("/api/proxy?route=servers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.apikey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        name: `${username}-server`,
        user: userId,
        egg: parseInt(global.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startup_cmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: {
          memory: Obj.ram,
          swap: 0,
          disk: Obj.disk,
          io: 500,
          cpu: Obj.cpu
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5
        },
        deploy: {
          locations: [parseInt(global.loc)],
          dedicated_ip: false,
          port_range: []
        },
        description: "Dibuat otomatis via QRIS"
      })
    });

    const server = await buatServer.json();
    if (server.errors) return alert("Gagal buat server panel:\n" + JSON.stringify(server.errors[0] || server));

    const output = `
Berhasil Membuat Akun Panel ✅

• ID Server: ${server.attributes.id}
• Nama Server: ${server.attributes.name}
• Username: ${user.attributes.username}
• Password: ${password}
• Login: ${global.domain}
• Ram: ${Obj.ram == "0" ? "Unlimited" : Obj.ram / 1000 + "GB"}
• Cpu: ${Obj.cpu == "0" ? "Unlimited" : Obj.cpu + "%"}
• Disk: ${Obj.disk == "0" ? "Unlimited" : Obj.disk / 1000 + "GB"}
• Expired: 1 Bulan

Harap simpan data ini baik-baik.
    `;

    alert(output);
    batalQris();
    resetForm();
  } catch (err) {
    console.error(err);
    alert("Gagal saat membuat akun/server. Cek konsol untuk detail.");
  }
}

// ====================================================================
// Fungsi Lain (Riwayat, Modal, Helper)
// ====================================================================

// Reset hanya input username & RAM
function resetForm() {
  const usernameEl = $("username");
  const ramEl = $("ram");
  if (usernameEl) usernameEl.value = "";
  if (ramEl) ramEl.selectedIndex = 0;
}

// ===== RIWAYAT TRANSAKSI =====
const STORAGE_KEY = "riwayat_transaksi_panel";

function getRiwayat() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Gagal baca riwayat:", e);
    return [];
  }
}

function simpanRiwayat(data) {
  const list = getRiwayat();
  list.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Render riwayat ke modal
function renderRiwayat() {
  const container = $("riwayatList");
  const list = getRiwayat();

  if (!list.length) {
    container.innerHTML =
      '<p class="riwayat-empty">Belum ada transaksi di perangkat ini.</p>';
    return;
  }

  // urutkan terbaru di atas
  list.sort((a, b) => {
    return new Date(b.waktu).getTime() - new Date(a.waktu).getTime();
  });

  container.innerHTML = "";
  list.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "riwayat-item";

    const paketLabel =
      item.paket === "1gb"
        ? "1 GB"
        : item.paket === "2gb"
        ? "2 GB"
        : item.paket === "3gb"
        ? "3 GB"
        : item.paket === "4gb"
        ? "4 GB"
        : item.paket;

    div.innerHTML =
      `<div class="riwayat-item-title">Panel ${paketLabel}</div>` +
      `<div class="riwayat-item-meta">👤 ${item.username}</div>` +
      `<div class="riwayat-item-meta">🕒 ${item.waktu}</div>` +
      `<div class="riwayat-item-meta">🆔 ${item.id}</div>`;
    container.appendChild(div);
  });
}

// ===== MODAL CONTROL =====
function openRiwayat() {
  renderRiwayat();
  const modal = $("riwayatModal");
  modal.classList.add("show");
}

function closeRiwayat() {
  const modal = $("riwayatModal");
  modal.classList.remove("show");
}

// ===== MENCEGAH PULL-TO-REFRESH DI MOBILE =====
function setupPullToRefreshBlocker() {
  let startY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches && e.touches.length > 0) {
        startY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      const currentY = e.touches[0].clientY;
      const yDiff = currentY - startY;

      if (window.scrollY === 0 && yDiff > 10) {
        // menarik ke bawah di posisi paling atas -> block
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

// INIT
window.addEventListener("load", () => {
  setupPullToRefreshBlocker();
});
      
