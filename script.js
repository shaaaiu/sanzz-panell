// GLOBAL CONFIG DENGAN TELEGRAM DAN API ADMIN (Sesuai Konfigurasi Terakhir)
const global = {
  domain: "https://panel.xiao-store.web.id", 
  apikey: "ptla_sRRmcKRjicoJfsioKKZqlb8221avLOQlLdzNFJifzzE", // Kunci PTLA Anda
  
  // !!! PENTING: GANTI KUNCI PTLC/PTLAN DI BAWAH INI !!!
  admin_url: "https://panel.xiao-store.web.id", 
  admin_apikey: "ptla_sRRmcKRjicoJfsioKKZqlb8221avLOQlLdzNFJifzzE", // <--- HARAP GANTI INI DENGAN KUNCI PTLC/PTLAN ASLI
  
  nestid: "5",
  egg: "15",
  loc: "1", // ID Lokasi Server
  
  qrisBaseUrl: "https://apii.ryuuxiao.biz.id", 
  qrisApiToken: "RyuuXiao", 
  qrisUsername: "adjie22", 
  qrisOrderToken: "1451589:fsoScMnGEp6kjIQav2L7l0ZWgd1NXVer", 

  CURRENT_QRIS_KEY: "current_qris_session",
  STORAGE_KEY: "riwayat_transaksi_panel",
  PANEL_LOGIN_LINK: "https://panel.xiao-store.web.id",
  
  TELEGRAM_BOT_TOKEN: "7724085258:AAEbMfcySTFwPPL_xHcdr0EYm0oCD6oYNRI",
  TELEGRAM_CHAT_ID: "5254873680",
};

// PACKAGE CONFIG (Nilai Disk, Memory, CPU sudah disiapkan)
const PACKAGE_CONFIG = {
  '1':  { nama: '500mb', harga: 1,  memo: 1048,  disk: 2000, cpu: 30  },
  '2000':  { nama: '1gb', harga: 2000,  memo: 1048,  disk: 2000, cpu: 30  },
  '3000':  { nama: '2gb', harga: 3000,  memo: 2048,  disk: 2000, cpu: 50  },
  '4000':  { nama: '3gb', harga: 4000,  memo: 3048,  disk: 2000, cpu: 75  },
  '5000':  { nama: '4gb', harga: 5000,  memo: 4048,  disk: 2000, cpu: 100 },
  '6000':  { nama: '5gb', harga: 6000,  memo: 5048,  disk: 2000, cpu: 130 },
  '7000':  { nama: '6gb', harga: 7000,  memo: 6048,  disk: 2000, cpu: 150 },
  '8000':  { nama: '7gb', harga: 8000,  memo: 7048,  disk: 2000, cpu: 175 },
  '9000':  { nama: '8gb', harga: 9000,  memo: 8048,  disk: 2000, cpu: 200 },
  '10000': { nama: '9gb', harga: 10000, memo: 9048,  disk: 2000, cpu: 225 },
  '12000': { nama: '10gb', harga: 12000, memo: 10048, disk: 2000, cpu: 250 },
  '15000': { nama: 'unli', harga: 15000, memo: 0,     disk: 0,    cpu: 0 } 
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
        
        mulaiCekMutasi(qrisData.paymentId, qrisData.username, qrisData.totalHargaDibayar, qrisData.telepon, qrisData.hargaTanpaUnik); 
        return true;

    } catch(e) {
        console.error("Gagal memuat QRIS tersimpan:", e);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        return false;
    }
}

async function sendTelegramNotification(message) {
    if (!global.TELEGRAM_BOT_TOKEN || !global.TELEGRAM_CHAT_ID) {
        console.warn("Konfigurasi Telegram Bot Token atau Chat ID belum disetel.");
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
          const expireDate = new Date(now.setMonth(now.getMonth() + 1));
          
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
              panelPass: username, 
              panelLink: global.PANEL_LOGIN_LINK, 
              exp: expireDate.toLocaleDateString("id-ID") 
          });
          
          const notifMsg = 
            `💰 *TRANSAKSI BERHASIL (KODE UNIK)* 💰\n\n`+
            `*ID Transaksi:* ${paymentId}\n`+
            `*Total Diterima:* ${toRupiah(totalHargaDibayar)}\n`+
            `*Harga Dasar:* ${toRupiah(hargaTanpaUnik)}\n`+
            `*Paket RAM:* ${ramNama.toUpperCase()}\n`+
            `*Username:* ${username}\n`+
            `*Nomor Pembeli:* ${telepon}\n`+
            `*Waktu:* ${new Date().toLocaleString("id-ID")}\n\n`+
            `Proses pembuatan server dan user dimulai...`;
            
          sendTelegramNotification(notifMsg);
          
          alert("Pembayaran diterima! Server akan segera dibuat.");
          
          buatUserDanServer(username, hargaTanpunik, telepon); 
          
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
  localStorage.removeItem(global.CURRENT_QRIS_KEY); 
  
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
// FUNGSI BUAT USER DAN SERVER (PERBAIKAN LIMITS DAN LOC)
// ===============================================

async function buatUserDanServer(username, ramHarga, telepon) {
    alert("Memulai proses pembuatan user dan server...");
    
    let userId;
    
    try {
        // 1. Dapatkan Konfigurasi Paket RAM, DISK, CPU
        const config = PACKAGE_CONFIG[ramHarga.toString()];
        
        if (!config) {
            throw new Error("Konfigurasi paket RAM tidak ditemukan. Harga paket tidak valid.");
        }
        
        // 2. BUAT USER BARU DI PTERODACTYL (PTLC/PTLAN API KEY)
        const userPass = username;
        const userEmail = `${username}@tempmail.com`;
        const userPayload = {
            email: userEmail,
            username: username,
            first_name: username,
            last_name: 'Panel',
            password: userPass
        };

        const userRes = await fetch(`${global.admin_url}/api/application/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${global.admin_apikey}`
            },
            body: JSON.stringify(userPayload)
        });

        const userData = await userRes.json();
        
        if (userRes.status === 422 && userData.errors && userData.errors.username) {
             console.warn("Username sudah terdaftar, mencoba mengambil ID yang sudah ada.");
             const searchRes = await fetch(`${global.admin_url}/api/application/users?filter[username]=${username}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${global.admin_apikey}`
                }
             });
             const searchData = await searchRes.json();
             if (searchData.data.length > 0) {
                 userId = searchData.data[0].attributes.id;
             } else {
                 throw new Error("Gagal membuat user dan user tidak ditemukan.");
             }
        } else if (!userRes.ok) {
            console.error("Gagal membuat user:", userData);
            throw new Error(`Gagal membuat user: ${userData.errors ? userData.errors[0].detail : userRes.statusText}`);
        } else {
            userId = userData.attributes.id;
        }

        if (!userId) {
             throw new Error("Gagal mendapatkan User ID.");
        }
        
        console.log(`User ID berhasil didapatkan: ${userId}`);

        // 3. LOGIKA LIMITS & SERVER (Menggunakan nilai dinamis dari config)
        let memoryLimit = config.memo;
        let diskLimit = config.disk;
        let cpuLimit = config.cpu;
        
        if (config.nama === 'unli') {
            memoryLimit = 999999; 
            diskLimit = 999999;
            cpuLimit = 100; // CPU Unli disetel ke 100%
        }

        const serverPayload = {
            name: username,
            user: userId,
            
            // Konfigurasi Server
            egg: parseInt(global.egg),
            nest: parseInt(global.nestid),
            location: parseInt(global.loc), // Menggunakan ID Lokasi dari global
            
            docker_image: "quay.io/pterodactyl/core:java", 
            start_on_completion: true,
            environment: {
                "SERVER_JARFILE": "server.jar", 
                "P_SERVER_LOCATION": "World"
            },
            // LIMITS DIAMBIL DARI LOGIKA DI ATAS
            limits: {
                memory: memoryLimit,
                swap: 0,
                disk: diskLimit,
                io: 500,
                cpu: cpuLimit
            },
            feature_limits: {
                databases: 0,
                allocations: 1,
                backups: 0
            }
        };
        

        const serverRes = await fetch(`${global.domain}/api/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": global.apikey 
            },
            body: JSON.stringify(serverPayload)
        });
        
        const serverData = await serverRes.json();
        
        if (!serverData.success) {
            console.error("Gagal membuat server:", serverData);
            throw new Error(`Gagal membuat server: ${serverData.message || "Kesalahan API PTLA"}`);
        }
        
        const serverId = serverData.server_id || "N/A";
        alert(`Server berhasil dibuat! ID Server: ${serverId}`);
        
        // Kirim Notifikasi Sukses
        const successMsg = 
            `✅ *SERVER BERHASIL DIBUAT!* ✅\n\n`+
            `*User ID:* ${userId}\n`+
            `*Server ID:* ${serverId}\n`+
            `*Username:* ${username}\n`+
            `*Password:* ${username}\n`+
            `*RAM/Disk/CPU:* ${memoryLimit}MB/${diskLimit}MB/${cpuLimit}%\n`+ // Tampilkan limit yang benar
            `*Link Login:* ${global.PANEL_LOGIN_LINK}\n`+
            `*Nomor:* ${telepon}`;
        
        sendTelegramNotification(successMsg);

    } catch (e) {
        console.error(e);
        const errorMsg = 
            `❌ *GAGAL MEMBUAT SERVER/USER* ❌\n\n`+
            `*Username:* ${username}\n`+
            `*Paket:* ${ramHarga} (Harga Dasar)\n`+
            `*Nomor:* ${telepon}\n`+
            `*Error:* ${e.message}\n\n`+
            `Tolong cek panel admin secara manual.`;
            
        sendTelegramNotification(errorMsg);
        alert("Gagal membuat user atau server. Cek console log & notifikasi Telegram admin.");
    }
}


// RIWAYAT (Tidak ada perubahan di sini)
function getRiwayat(){
  try{
    const raw=localStorage.getItem(global.STORAGE_KEY);
    if(!raw) return [];
    const p=JSON.parse(raw);
    return Array.isArray(p) ? p.map(item => ({...item, uniqueId: item.uniqueId || Math.random().toString(36).substring(2) + Date.now()})) : [];
  }catch{return [];}
}

function simpanRiwayat(d){
  const l=getRiwayat(); 
  l.push({...d, uniqueId: Math.random().toString(36).substring(2) + Date.now()}); 
  localStorage.setItem(global.STORAGE_KEY,JSON.stringify(l));
}

function renderRiwayat(){
  const c=$("riwayatList");
  const list=getRiwayat();
  const successList = list.filter(item => item.status === "Sukses");

  if(!successList.length){
    c.innerHTML='<p class="riwayat-empty">Belum ada transaksi yang berhasil.</p>'; return;
  }
  c.innerHTML="";
  successList.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  successList.forEach(item=>{
    const config = PACKAGE_CONFIG[item.harga.toString()];
    const paketNama = config ? config.nama.toUpperCase() : 'N/A';
    const hargaText = item.harga ? toRupiah(item.harga) : 'RpN/A';
    
    const panelUser = item.panelUser || item.username; 
    const panelPass = item.panelPass || item.username;
    const panelLink = item.panelLink || 'N/A';
    const expDate = item.exp || 'N/A';

    
    const div=document.createElement("div");
    div.className="riwayat-item";
    div.innerHTML=
      `<div class='riwayat-item-title'>Panel ${paketNama} - ${hargaText}</div>`+
      `<div class='riwayat-item-meta'>🆔 ID Transaksi: ${item.id}</div>`+
      `<div class='riwayat-item-meta'>📞 Nomor: ${item.telepon || 'N/A'}</div>`+ 
      `<div class='riwayat-item-meta'>🕒 Waktu Beli: ${item.waktu}</div>`+
      `<div class='riwayat-item-meta'>📅 Exp: ${expDate}</div>`+
      `<div class='riwayat-item-meta account-detail'>`+
          `<strong>👤 User:</strong> ${panelUser}<br>`+
          `<strong>🔑 Pass:</strong> ${panelPass}`+
      `</div>`+
      `<div class='riwayat-item-meta'>🔗 <a href="${panelLink}" target="_blank">${panelLink}</a></div>`+
      
      `<div class="riwayat-actions">`+
          `<button class="btn-copy" onclick="copyLogin('${panelUser}', '${panelPass}', '${panelLink}')">Copy Login</button>`+
          `<button class="btn-delete" onclick="hapusRiwayat('${item.uniqueId}')">Hapus</button>`+
      `</div>`; 
    c.appendChild(div);
  });
}

function copyLogin(user, pass, link) {
    const loginText = `Username: ${user}\nPassword: ${pass}\nLink Login: ${link}`;
    navigator.clipboard.writeText(loginText)
        .then(() => alert("Detail Login berhasil disalin!"))
        .catch(err => console.error('Gagal menyalin: ', err));
}

function hapusRiwayat(uniqueId) {
    let list = getRiwayat();
    list = list.filter(item => item.uniqueId !== uniqueId);
    localStorage.setItem(global.STORAGE_KEY, JSON.stringify(list));
    renderRiwayat();
    alert("Riwayat berhasil dihapus.");
}

function openRiwayat(){ 
  renderRiwayat();
  document.getElementById("riwayatModal").style.display="flex"; 
}
function closeRiwayat(){ 
  document.getElementById("riwayatModal").style.display="none"; 
}

function setupPullToRefreshBlocker(){
  // Mencegah pull-to-refresh pada perangkat mobile
  let startY;
  document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].pageY;
  });
  document.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].pageY;
      const delta = currentY - startY;
      // Jika scroll ke atas di bagian paling atas halaman
      if (document.body.scrollTop === 0 && delta > 0) {
          e.preventDefault();
      }
  }, { passive: false });
}

window.addEventListener("load",()=>{
    setupPullToRefreshBlocker();
    
    const qrisActive = loadSavedQris(); 
    
    // Inisialisasi event listener hanya jika tidak ada QRIS aktif
    if (!qrisActive) {
        updateTotalHarga(); 
    }
    
    // Attach event listeners
    document.getElementById('ram').addEventListener('change', updateTotalHarga);
    document.getElementById('btnBeli').addEventListener('click', buatQris);
    document.getElementById('btnBatal').addEventListener('click', () => batalQris(true));
    document.getElementById('btnRiwayat').addEventListener('click', openRiwayat);
    document.getElementById('closeModal').addEventListener('click', closeRiwayat);

    // Event listener untuk menutup modal riwayat jika klik di luar box
    document.getElementById('riwayatModal').addEventListener('click', (e) => {
        if (e.target.id === 'riwayatModal') {
            closeRiwayat();
        }
    });
});
