// GLOBAL CONFIG
const global = {
  // Domain panel Pterodactyl
  domain: "https://panel.xiao-store.web.id",

  // Application API Key Pterodactyl (ptla_....)
  // DIPAKAI LANGSUNG DI CLIENT (RESIKO, JANGAN SEBAR KE ORANG LAIN)
  ADMIN_SERVER_API: "ptla_sRRmcKRjicoJfsioKKZqlb8221avLOQlLdzNFJifzzE",

  nestid: "5",
  egg: "15",
  loc: "1",

  // QRIS CONFIG
  qrisBaseUrl: "https://apii.ryuuxiao.biz.id",
  qrisApiToken: "RyuuXiao",
  qrisUsername: "adjie22",
  qrisOrderToken: "1451589:fsoScMnGEp6kjIQav2L7l0ZWgd1NXVer",

  CURRENT_QRIS_KEY: "current_qris_session",
  STORAGE_KEY: "riwayat_transaksi_panel",
  PANEL_LOGIN_LINK: "https://panel.xiao-store.web.id",

  // TELEGRAM BOT OWNER
  TELEGRAM_BOT_TOKEN: "8105677831:AAFRyE6rRbIi3E9riMBIkaSA0Ya_lfT9tWg",
  TELEGRAM_CHAT_ID: "5254873680",
};

// PACKAGE CONFIG (Nilai Memory, Disk, CPU akan digunakan sesuai paket)
const PACKAGE_CONFIG = {
  '1':      { nama: '500mb', harga: 1,      memo: 1048,  disk: 2000, cpu: 30  },
  '2000':   { nama: '1gb',   harga: 2000,   memo: 1048,  disk: 2000, cpu: 30  },
  '3000':   { nama: '2gb',   harga: 3000,   memo: 2048,  disk: 2000, cpu: 50  },
  '4000':   { nama: '3gb',   harga: 4000,   memo: 3048,  disk: 2000, cpu: 75  },
  '5000':   { nama: '4gb',   harga: 5000,   memo: 4048,  disk: 2000, cpu: 100 },
  '6000':   { nama: '5gb',   harga: 6000,   memo: 5048,  disk: 2000, cpu: 130 },
  '7000':   { nama: '6gb',   harga: 7000,   memo: 6048,  disk: 2000, cpu: 150 },
  '8000':   { nama: '7gb',   harga: 8000,   memo: 7048,  disk: 2000, cpu: 175 },
  '9000':   { nama: '8gb',   harga: 9000,   memo: 8048,  disk: 2000, cpu: 200 },
  '10000':  { nama: '9gb',   harga: 10000,  memo: 9048,  disk: 2000, cpu: 225 },
  '12000':  { nama: '10gb',  harga: 12000,  memo: 10048, disk: 2000, cpu: 250 },
  '15000':  { nama: 'unli',  harga: 15000,  memo: 0,     disk: 0,    cpu: 0 } 
};

function $(id){return document.getElementById(id);}
function toRupiah(number) {
    if (isNaN(number) || number === null) return 'RpN/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number).replace('Rp', 'Rp');
}

function getKodeUnik() {
    return Math.floor(Math.random() * (999 - 100 + 1) + 100);
}

function getSelectedRamInfo() {
  const selectEl = $("ram");
  const selectedValue = selectEl.value; 
  const config = PACKAGE_CONFIG[selectedValue]; 
  return config || { nama: 'N/A', harga: 0, memo: 0, disk: 0, cpu: 0 };
}
function updateTotalHarga() {
  const { harga } = getSelectedRamInfo();
  $("totalHarga").textContent = `Total Harga: ${toRupiah(harga)}`;
}
function refreshInput(){
  const teleponEl=$("telepon"); 
  const usernameEl=$("username"); 
  const ramEl=$("ram");
  if(teleponEl) teleponEl.value="";
  if(usernameEl) usernameEl.value="";
  if(ramEl) ramEl.selectedIndex=0;
  updateTotalHarga(); 
  alert("Input berhasil di-reset.");
}

function loadSavedQris() {
    const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
    if (!savedQris) return false;

    try {
        const qrisData = JSON.parse(savedQris);
        const now = Date.now();
        
        if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < now) {
            localStorage.removeItem(global.CURRENT_QRIS_KEY);
            return false;
        }
        
        $("telepon").value = qrisData.telepon || ''; 
        $("username").value = qrisData.username || '';
        $("ram").value = qrisData.hargaTanpaUnik ? qrisData.hargaTanpaUnik.toString() : '';
        updateTotalHarga();

        $("qrisImage").src = qrisData.qrUrl;
        $("detailPembayaran").textContent = qrisData.detailText;
        $("qrisSection").classList.remove("hidden");
        $("btnBatal").classList.remove("hidden");
        
        // Memastikan parameter hargaTanpaUnik dikirimkan ke mutasi
        mulaiCekMutasi(qrisData.paymentId, qrisData.username, qrisData.totalHargaDibayar, qrisData.telepon, qrisData.hargaTanpaUnik); 
        return true;

    } catch(e) {
        console.error("Gagal memuat QRIS tersimpan:", e);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        return false;
    }
}

// FUNGSI SEND TELEGRAM DI SISI CLIENT INI TIDAK AMAN, KARENA KEY BOT TEREKSPOS.
async function sendTelegramNotification(message) {
    if (global.TELEGRAM_BOT_TOKEN.includes('DUMMY') || global.TELEGRAM_CHAT_ID.includes('DUMMY')) {
        console.warn("Konfigurasi Telegram Bot Token atau Chat ID belum disetel. Melewatkan notifikasi.");
        return;
    }
    
    const url = `https://api.telegram.org/bot${global.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const params = {
        chat_id: global.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    };

    const queryString = new URLSearchParams(params).toString();
    
    try {
        await fetch(`${url}?${queryString}`);
    } catch (e) {
        console.error("Kesalahan jaringan saat mengirim notifikasi Telegram:", e);
    }
}


async function buatQris(){
  const telepon=$("telepon").value.trim();
  const username=$("username").value.trim();
  const { harga: ramHarga, nama: ramNama } = getSelectedRamInfo(); 
  
  if(!telepon){ alert("Nomor Telepon tidak boleh kosong."); return; }
  if(!username){ alert("Username tidak boleh kosong."); return; }
  if(ramHarga <= 0){ alert("Pilih paket RAM terlebih dahulu."); return; } 

  const kodeUnik = getKodeUnik();
  const totalHargaDibayar = ramHarga + kodeUnik;

  const loadingText=$("loadingText");
  const qrisSection=$("qrisSection");
  const btnBatal=$("btnBatal");

  loadingText.classList.remove("hidden");

  try{
    if (localStorage.getItem(global.CURRENT_QRIS_KEY)) {
        alert("Selesaikan atau batalkan pembayaran QRIS yang sedang berjalan terlebih dahulu.");
        loadingText.classList.add("hidden");
        return;
    }
    
    const url=`${global.qrisBaseUrl}/orderkuota/createpayment?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}&amount=${totalHargaDibayar}`;
    const res=await fetch(url);
    const data=await res.json();

    loadingText.classList.add("hidden");

    if(!data.status || !data.result || !data.result.imageqris){
      console.error("Gagal membuat QRIS. Respons API:", data);
      alert("Gagal membuat QRIS. Cek console log."); 
      return;
    }

    const qrUrl=data.result.imageqris.url;
    const paymentId=data.result.trx_id || Math.random().toString(36).substring(2);

    qrisSection.classList.remove("hidden");
    btnBatal.classList.remove("hidden");

    $("qrisImage").src=qrUrl;

    const waktu=new Date().toLocaleString("id-ID");
    const detailText = 
      "INFORMASI PEMBAYARAN\n"+
      `ID        : ${paymentId}\n`+
      `Username  : ${username}\n`+
      `Paket     : ${ramNama.toUpperCase()} (${toRupiah(ramHarga)})\n`+
      `Kode Unik : ${kodeUnik}\n`+
      `*TOTAL BAYAR: ${toRupiah(totalHargaDibayar)}*\n`+ 
      `Waktu     : ${waktu}`;
      
    $("detailPembayaran").textContent = detailText;

    localStorage.setItem(global.CURRENT_QRIS_KEY, JSON.stringify({
        paymentId,
        username,
        telepon,
        hargaTanpaUnik: ramHarga,
        totalHargaDibayar: totalHargaDibayar,
        ramNama,
        qrUrl,
        detailText,
        waktuKadaluarsa: Date.now() + (30 * 60 * 1000)
    }));

    mulaiCekMutasi(paymentId, username, totalHargaDibayar, telepon, ramHarga);
  
  }catch(err){
    console.error(err);
    loadingText.classList.add("hidden");
    alert("Terjadi kesalahan membuat QRIS.");
  }
}

let mutasiInterval;

async function mulaiCekMutasi(paymentId, username, totalHargaDibayar, telepon, hargaTanpaUnik){
  let counter=0; const maxCheck=60;

  if (mutasiInterval) clearInterval(mutasiInterval);

  mutasiInterval = setInterval(async()=>{
    counter++;

    try{
      const url=`${global.qrisBaseUrl}/orderkuota/mutasiqr?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}`;
      const res=await fetch(url);
      const data=await res.json();

      if(data.result){
        const found=data.result.find(tx=>{
          const nominal=parseInt(tx.kredit.replace(/\./g,"")); 
          return tx.status==="IN" && nominal === totalHargaDibayar;
        });

        if(found){
          clearInterval(mutasiInterval);
          localStorage.removeItem(global.CURRENT_QRIS_KEY); 
          
          const now = new Date();
          const expireDate = new Date(now.getTime() + 30*24*60*60*1000); // +30 hari
          
          const config = PACKAGE_CONFIG[hargaTanpaUnik.toString()];
          const ramNama = config ? config.nama : 'N/A';

          simpanRiwayat({
              id: paymentId,
              username: username,
              telepon: telepon,
              harga: hargaTanpaUnik,
              waktu: new Date().toLocaleString("id-ID"),
              status: "Sukses",
              panelUser: username, 
              panelPass: username + "001", 
              panelLink: global.PANEL_LOGIN_LINK, 
              exp: expireDate.toLocaleDateString("id-ID") 
          });
          
          const notifMsg = 
`💰 *TRANSAKSI BERHASIL (KODE UNIK)*

🆔 ID Transaksi : *${paymentId}*
👤 Username     : *${username}*
📱 No Pembeli   : *${telepon}*

📦 Paket        : *${ramNama.toUpperCase()}*
💰 Harga Dasar  : *${toRupiah(hargaTanpaUnik)}*
💵 Total Dibayar: *${toRupiah(totalHargaDibayar)}*

🕒 Waktu        : ${new Date().toLocaleString("id-ID")}

🔁 Proses pembuatan akun & server panel dimulai...
`;

          // Notif ke owner saat pembayaran masuk
          sendTelegramNotification(notifMsg);
          
          alert("Pembayaran diterima! Server akan segera dibuat.");
          
          // PANGGIL FUNGSI UNTUK BUAT USER + SERVER DI PANEL
          panggilServerBuatAkun(username, hargaTanpaUnik, telepon); 
          
          closeQris(); 
          return;
        }
      }

      if(counter>=maxCheck){
        clearInterval(mutasiInterval);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        alert("Waktu pembayaran habis.");
        batalQris(true); 
      }

    }catch(e){ 
        const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
        if (savedQris) {
            const qrisData = JSON.parse(savedQris);
            if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < Date.now()) {
                clearInterval(mutasiInterval);
                localStorage.removeItem(global.CURRENT_QRIS_KEY);
                alert("Waktu pembayaran habis.");
                closeQris();
            }
        }
        console.error(e); 
    }
  },10000);
}

function closeQris(){
  if (mutasiInterval) clearInterval(mutasiInterval);
  localStorage.removeItem(global.CURRENT_QRIS_KEY); 
  
  $("qrisSection").classList.add("hidden");
  $("btnBatal").classList.add("hidden");
  $("qrisImage").src="";
  $("detailPembayaran").textContent="";
  refreshInput(); 
}

function batalQris(show_alert = false){
  if (mutasiInterval) clearInterval(mutasiInterval);
  localStorage.removeItem(global.CRIS_KEY); 
  
  $("qrisSection").classList.add("hidden");
  $("btnBatal").classList.add("hidden");
  $("qrisImage").src="";
  $("detailPembayaran").textContent="";
  refreshInput(); 
  
  if (show_alert) {
      alert("Pembayaran QRIS dibatalkan.");
  }
}

// ===============================================
// FUNGSI BUAT USER & SERVER DI PANEL (PANGGIL PTERODACTYL LANGSUNG)
// ===============================================

async function panggilServerBuatAkun(username, ramHarga, telepon) {
    try {
        if (!global.domain.startsWith("http")) {
            throw new Error("global.domain belum diatur dengan benar.");
        }
        if (!global.ADMIN_SERVER_API || !global.ADMIN_SERVER_API.startsWith("ptla_")) {
            console.warn("ADMIN_SERVER_API seharusnya Application API Key Pterodactyl (ptla_...).");
        }

        const config = PACKAGE_CONFIG[ramHarga.toString()];
        if (!config) {
            throw new Error("Konfigurasi paket RAM tidak ditemukan.");
        }

        const email = username + "@panel.com";
        const password = username + "001";
        const name = username + "-" + config.nama.toUpperCase();

        // 1. BUAT USER
        const createUserRes = await fetch(`${global.domain}/api/application/users`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + global.ADMIN_SERVER_API
            },
            body: JSON.stringify({
                email: email,
                username: username,
                first_name: username,
                last_name: username,
                language: "en",
                password: password
            })
        });

        const userText = await createUserRes.text();
        let userData;
        try {
            userData = JSON.parse(userText);
        } catch (err) {
            console.error("RESPON USER BUKAN JSON:", userText);
            throw new Error("Gagal membuat user panel (respon tidak valid).");
        }

        if (userData.errors) {
            throw new Error("Gagal membuat user panel: " + userData.errors[0].detail);
        }
        const user = userData.attributes;

        // 2. AMBIL STARTUP EGG
        const eggRes = await fetch(`${global.domain}/api/application/nests/${global.nestid}/eggs/${global.egg}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + global.ADMIN_SERVER_API
            }
        });
        const eggData = await eggRes.json();
        const startup_cmd = eggData.attributes.startup;

        // 3. BUAT SERVER
        const serverRes = await fetch(`${global.domain}/api/application/servers`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + global.ADMIN_SERVER_API
            },
            body: JSON.stringify({
                name: name,
                description: "Panel Auto Create",
                user: user.id,
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
                    memory: config.memo,
                    swap: 0,
                    disk: config.disk,
                    io: 500,
                    cpu: config.cpu
                },
                feature_limits: {
                    databases: 5,
                    backups: 5,
                    allocations: 1
                },
                deploy: {
                    locations: [parseInt(global.loc)],
                    dedicated_ip: false,
                    port_range: []
                }
            })
        });

        const serverText = await serverRes.text();
        let serverData;
        try {
            serverData = JSON.parse(serverText);
        } catch (err) {
            console.error("RESPON SERVER BUKAN JSON:", serverText);
            throw new Error("Gagal membuat server (respon tidak valid).");
        }

        if (serverData.errors) {
            throw new Error("Gagal membuat server: " + serverData.errors[0].detail);
        }
        const server = serverData.attributes;

        // NOTIF KE OWNER TELEGRAM (DETAIL LENGKAP)
        const notifOwner =
`🥳 *PEMBELIAN PANEL + CREATE SERVER BERHASIL*
━━━━━━━━━━━━━━
👤 Username Panel : *${user.username}*
📱 Nomor WA       : *${telepon}*

📦 Paket          : *${config.nama}*
💾 RAM            : *${config.memo} MB*
💻 CPU            : *${config.cpu}%*
💽 Disk           : *${config.disk} MB*

🧩 Nest / Egg     : *${global.nestid} / ${global.egg}*
🆔 User ID        : *${user.id}*
🖥️ Server ID      : *${server.id}*

🔐 Password       : *${password}*
🌐 Login Panel    : ${global.PANEL_LOGIN_LINK}

✅ Status         : *BERHASIL DIBUAT*`;

        sendTelegramNotification(notifOwner);

        alert(`Server berhasil dibuat!\nUsername: ${user.username}\nPassword: ${password}`);

    } catch (e) {
        console.error(e);
        alert(`Gagal membuat user atau server. Cek console log & pastikan panel API bisa diakses:\n${e.message}`);
    }
}


// RIWAYAT (BISA DIISI / DISAMAKAN DENGAN KODE ASLI KAMU)
function getRiwayat(){
  // ... (Logika getRiwayat asli kamu taruh di sini)
}

function simpanRiwayat(d){
  // ... (Logika simpanRiwayat asli kamu taruh di sini)
}

function renderRiwayat(){
  // ... (Logika renderRiwayat asli kamu taruh di sini)
}

function copyLogin(user, pass, link) {
  // ... (Logika copyLogin asli kamu taruh di sini)
}

function hapusRiwayat(uniqueId) {
  // ... (Logika hapusRiwayat asli kamu taruh di sini)
}

function openRiwayat(){ 
  // ... (Logika openRiwayat asli kamu taruh di sini)
}
function closeRiwayat(){ 
  // ... (Logika closeRiwayat asli kamu taruh di sini)
}

function setupPullToRefreshBlocker(){
  // ... (Logika setupPullToRefreshBlocker asli kamu taruh di sini)
}

window.addEventListener("load",()=>{
    setupPullToRefreshBlocker();
    
    const qrisActive = loadSavedQris(); 
    
    if (!qrisActive) {
        updateTotalHarga(); 
    }
});
