function $(id) {
  return document.getElementById(id);
}

// Reset hanya input username & RAM
function resetForm() {
  const usernameEl = $("username");
  const ramEl = $("ram");
  if (usernameEl) usernameEl.value = "";
  if (ramEl) ramEl.selectedIndex = 0;
}

// Simulasi pembuatan QRIS + simpan riwayat
function buatQris() {
  const username = $("username").value.trim();
  const ram = $("ram").value;

  if (!username) {
    alert("Username tidak boleh kosong.");
    return;
  }

  const loadingText = $("loadingText");
  const qrisSection = $("qrisSection");
  const btnBatal = $("btnBatal");

  // tampilkan loading
  loadingText.classList.remove("hidden");

  // simulasi delay pembuatan QRIS (ganti dengan API asli kalau perlu)
  setTimeout(() => {
    loadingText.classList.add("hidden");

    // tampilkan section QRIS & tombol batal
    qrisSection.classList.remove("hidden");
    btnBatal.classList.remove("hidden");

    // set contoh gambar QR (bisa diganti sumber lain)
    const qrisImg = $("qrisImage");
    const payload = `username=${encodeURIComponent(
      username
    )}&ram=${encodeURIComponent(ram)}&time=${Date.now()}`;
    qrisImg.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
      payload;

    // buat data transaksi
    const data = {
      id: Math.random().toString(36).substring(2),
      username: username,
      paket: ram,
      waktu: new Date().toLocaleString("id-ID"),
    };

    $("detailPembayaran").textContent =
      "INFORMASI PEMBAYARAN\n" +
      `ID        : ${data.id}\n` +
      `Username  : ${data.username}\n` +
      `Paket     : ${data.paket}\n` +
      `Waktu     : ${data.waktu}`;

    // simpan ke riwayat di localStorage perangkat ini
    simpanRiwayat(data);
  }, 1200);
}

// Batalkan pembayaran: sembunyikan & hapus QRIS
function batalQris() {
  const qrisSection = $("qrisSection");
  const qrisImg = $("qrisImage");
  const detail = $("detailPembayaran");
  const btnBatal = $("btnBatal");

  qrisSection.classList.add("hidden");
  btnBatal.classList.add("hidden");
  if (qrisImg) qrisImg.src = "";
  if (detail) detail.textContent = "";
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
