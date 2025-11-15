// GLOBAL CONFIG (Pastikan nilai-nilai ini sudah benar)
const global = {
  domain: "https://mikudevprivate.pteropanelku.biz.id",
  apikey: "ptla_7gss1IvRmWISvixYyZ4fEQgPD6wLvakmAeZMyoT9HFQ", // API PTERODACTYL
  nestid: "5",
  egg: "15",
  loc: "1",
  
  // --- KONFIGURASI UNTUK API QRIS BARU (https://apii.ryuuxiao.biz.id) ---
  qrisBaseUrl: "https://apii.ryuuxiao.biz.id", 
  qrisApiToken: "RyuuXiao", 
  qrisUsername: "adjie22", 
  qrisOrderToken: "1451589:fsoScMnGEp6kjIQav2L7l0ZWgd1NXVer", 

  // Variabel untuk menyimpan data QRIS saat ini
  CURRENT_QRIS_KEY: "current_qris_session",
  STORAGE_KEY: "riwayat_transaksi_panel",
};

// 1. STRUKTUR DATA HARGA DAN SPESIFIKASI PANEL BARU
const PACKAGE_CONFIG = {
  // Key harus sesuai dengan nilai 'value' di HTML option
  '1gb': { nama: '1gb', harga: 10000, memo: 1048, disk: 2000, cpu: 30 },
  '2gb': { nama: '2gb', harga: 20000, memo: 2048, disk: 4000, cpu: 50 },
  '3gb': { nama: '3gb', harga: 30000, memo: 3048, disk: 6000, cpu: 75 },
  '4g ': { nama: '4gb', harga: 40000, memo: 4048, disk: 8000, cpu: 100 },
  // Tambahkan paket lain yang ingin Anda dukung di HTML
  // '50000': { nama: '5gb', harga: 50000, memo: 5048, disk: 2000, cpu: 130 },
  // ...
};


function $(id){return document.getElementById(id);}

// Fungsi Pembantu
function toRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number).replace('Rp', 'Rp');
}
function getSelectedRamInfo() {
  const selectEl = $("ram");
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  const harga = selectedOption.value ? parseInt(selectedOption.value) : 0;
  
  // Cari info paket dari PACKAGE_CONFIG berdasarkan harga (value di option)
  const config = PACKAGE_CONFIG[harga.toString()]; 
  
  // Mengembalikan data lengkap atau default jika tidak ditemukan
  return config || { nama: 'N/A', harga: 0, memo: 0, disk: 0, cpu: 0 };
}

// Deteksi Harga Otomatis & Update Display
function updateTotalHarga() {
  const { harga } = getSelectedRamInfo();
  $("totalHarga").textContent = `Total Harga: ${toRupiah(harga)}`;
}

// Fungsi Reset Input (Tombol Refresh Data)
function refreshInput(){
  const usernameEl=$("username"); 
  const ramEl=$("ram");
  if(usernameEl) usernameEl.value="";
  if(ramEl) ramEl.selectedIndex=0;
  updateTotalHarga(); 
  alert("Input username dan pilihan panel berhasil di-reset.");
}

// Dipanggil saat halaman dimuat
function loadSavedQris() {
    const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
    if (!savedQris) return;

    try {
        const qrisData = JSON.parse(savedQris);
        const now = Date.now();
        
        // Cek kadaluarsa
        if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < now) {
            localStorage.removeItem(global.CURRENT_QRIS_KEY);
            return;
        }

        $("qrisImage").src = qrisData.qrUrl;
        $("detailPembayaran").textContent = qrisData.detailText;
        $("qrisSection").classList.remove("hidden");
        $("btnBatal").classList.remove("hidden");
        
        // Lanjutkan pengecekan mutasi
        // Menggunakan qrisData.harga sebagai amount/ramHarga
        mulaiCekMutasi(qrisData.paymentId, qrisData.username, qrisData.harga);

    } catch(e) {
        console.error("Gagal memuat QRIS tersimpan:", e);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
    }
}

// QRIS REAL
async function buatQris(){
  const username=$("username").value.trim();
  const { harga: ramHarga, nama: ramNama } = getSelectedRamInfo(); // Mengambil nama dan harga
  const ramValue = ramHarga;

  if(!username){ alert("Username tidak boleh kosong."); return; }
  if(ramValue <= 0){ alert("Pilih paket RAM terlebih dahulu."); return; }

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
    
    // Menggunakan harga sebagai 'amount'
    const url=`${global.qrisBaseUrl}/orderkuota/createpayment?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}&amount=${ramValue}`;
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
      `Paket     : ${ramNama} (${toRupiah(ramHarga)})\n`+ 
      `Waktu     : ${waktu}`;
      
    $("detailPembayaran").textContent = detailText;

    // Simpan status QRIS ke Local Storage
    localStorage.setItem(global.CURRENT_QRIS_KEY, JSON.stringify({
        paymentId,
        username,
        harga: ramHarga,
        ramNama,
        qrUrl,
        detailText,
        waktuKadaluarsa: Date.now() + (30 * 60 * 1000) // Kadaluarsa 30 menit
    }));

    mulaiCekMutasi(paymentId, username, ramHarga);
  
  }catch(err){
    console.error(err);
    loadingText.classList.add("hidden");
    alert("Terjadi kesalahan membuat QRIS.");
  }
}

// AUTO MUTASI
let mutasiInterval;

async function mulaiCekMutasi(paymentId, username, ramHarga){
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
          return tx.status==="IN" && nominal==ramHarga;
        });

        if(found){
          clearInterval(mutasiInterval);
          localStorage.removeItem(global.CURRENT_QRIS_KEY); 
          
          // Simpan dengan status Sukses
          simpanRiwayat({id:paymentId,username,harga:ramHarga,waktu:new Date().toLocaleString("id-ID"), status: "Sukses"});
          
          alert("Pembayaran diterima! Membuat server...");
          // Panggil buatServerPTLA dengan harga/paket yang sudah terdeteksi
          buatServerPTLA(username, ramHarga); 
          batalQris(); 
          return;
        }
      }

      if(counter>=maxCheck){
        clearInterval(mutasiInterval);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        alert("Waktu pembayaran habis.");
        batalQris(); 
      }

    }catch(e){ 
        const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
        if (savedQris) {
            const qrisData = JSON.parse(savedQris);
            if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < Date.now()) {
                clearInterval(mutasiInterval);
                localStorage.removeItem(global.CURRENT_QRIS_KEY);
                alert("Waktu pembayaran habis.");
                batalQris();
            }
        }
        console.error(e); 
    }
  },10000);
}

// 2. PTLA CREATE SERVER DENGAN LOGIKA SPESIFIKASI BARU
async function buatServerPTLA(username, ramHarga){
  // Ambil konfigurasi paket berdasarkan harga yang dibayarkan
  const config = PACKAGE_CONFIG[ramHarga.toString()];

  if (!config) {
    alert("Gagal membuat server: Konfigurasi paket tidak ditemukan.");
    return;
  }
  
  try{
    const payload={
      server_name: username,
      // Menggunakan nilai dari PACKAGE_CONFIG
      ram: config.memo,     // Memory (RAM) dalam MB
      disk: config.disk,    // Disk dalam MB (diasumsikan 2000MB/2GB)
      cpu: config.cpu,      // CPU dalam %
      user: username
    };

    const res=await fetch(`${global.domain}/api/create`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:global.apikey
      },
      body:JSON.stringify(payload)
    });

    const data=await res.json();
    if(!data.success){
      alert("Pembayaran sukses, tetapi gagal membuat server. Pesan: " + (data.message || "Kesalahan API"));
      return;
    }

    alert("Server berhasil dibuat! ID Server: " + (data.server_id || "N/A"));

  }catch(e){
    console.error(e);
    alert("Gagal membuat server.");
  }
}

function batalQris(){
  if (mutasiInterval) clearInterval(mutasiInterval);
  localStorage.removeItem(global.CURRENT_QRIS_KEY); 
  
  $("qrisSection").classList.add("hidden");
  $("btnBatal").classList.add("hidden");
  $("qrisImage").src="";
  $("detailPembayaran").textContent="";
  alert("Pembayaran QRIS dibatalkan.");
}


// RIWAYAT
function getRiwayat(){
  try{
    const raw=localStorage.getItem(global.STORAGE_KEY);
    if(!raw) return [];
    const p=JSON.parse(raw);
    // Tambahkan 'id' jika belum ada untuk memastikan setiap item bisa dihapus
    return Array.isArray(p) ? p.map(item => ({...item, uniqueId: item.uniqueId || Math.random().toString(36).substring(2) + Date.now()})) : [];
  }catch{return [];}
}

function simpanRiwayat(d){
  const l=getRiwayat(); 
  l.push({...d, uniqueId: Math.random().toString(36).substring(2) + Date.now()}); // Tambahkan ID unik
  localStorage.setItem(global.STORAGE_KEY,JSON.stringify(l));
}

// 4. Render Riwayat di Modal (Popup) - Hanya Sukses
function renderRiwayat(){
  const c=$("riwayatList");
  const list=getRiwayat();
  // Filter hanya yang statusnya "Sukses"
  const successList = list.filter(item => item.status === "Sukses");

  if(!successList.length){
    c.innerHTML='<p class="riwayat-empty">Belum ada transaksi yang berhasil.</p>'; return;
  }
  c.innerHTML="";
  successList.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  successList.forEach(item=>{
    const div=document.createElement("div");
    div.className="riwayat-item";
    
    const config = PACKAGE_CONFIG[item.harga.toString()];
    const paketNama = config ? config.nama.toUpperCase() : 'N/A';
    const hargaText = item.harga ? toRupiah(item.harga) : 'RpN/A';
    
    div.innerHTML=
      `<div class='riwayat-item-title'>Panel ${paketNama}</div>`+
      `<div class='riwayat-item-meta'>💰 Harga: ${hargaText}</div>`+
      `<div class='riwayat-item-meta'>👤 Username: ${item.username}</div>`+
      `<div class='riwayat-item-meta'>🕒 Waktu: ${item.waktu}</div>`+
      `<div class='riwayat-item-meta'>🆔 ID Transaksi: ${item.id}</div>`+
      `<div class='riwayat-item-meta'>✅ Status: ${item.status || "Sukses"}</div>`+
      // 3. Tambah tombol hapus
      `<button class="btn-delete" onclick="hapusRiwayat('${item.uniqueId}')">Hapus</button>`; 
    c.appendChild(div);
  });
}

// 3. Fungsi Hapus Riwayat
function hapusRiwayat(uniqueId) {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat ini?")) return;

    const list = getRiwayat().filter(item => item.uniqueId !== uniqueId);
    localStorage.setItem(global.STORAGE_KEY, JSON.stringify(list));
    
    renderRiwayat(); // Perbarui tampilan modal
}


function openRiwayat(){ 
    renderRiwayat(); 
    $("riwayatModal").classList.add("show"); 
}
function closeRiwayat(){ 
    $("riwayatModal").classList.remove("show"); 
}

// Anti Pull Refresh (Tidak ada perubahan)
function setupPullToRefreshBlocker(){
  let startY=0;
  window.addEventListener("touchstart",e=>{
    if(e.touches.length>0) startY=e.touches[0].clientY;
  },{passive:true});
  window.addEventListener("touchmove",e=>{
    const y=e.touches[0].clientY-startY;
    if(window.scrollY===0 && y>10) e.preventDefault();
  },{passive:false});
}

window.addEventListener("load",()=>{
    setupPullToRefreshBlocker();
    updateTotalHarga(); // Inisialisasi display harga
    loadSavedQris();    // Cek status QRIS saat refresh
});
