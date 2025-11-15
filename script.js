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

function $(id){return document.getElementById(id);}

// Fungsi Pembantu
function toRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number).replace('Rp', 'Rp');
}
function getSelectedRamInfo() {
  const selectEl = $("ram");
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  const harga = selectedOption.value ? parseInt(selectedOption.value) : 0;
  const namaPaket = selectedOption.getAttribute("data-ram") || 'N/A';
  
  return { harga, namaPaket };
}

// 1. Deteksi Harga Otomatis & Update Display
function updateTotalHarga() {
  const { harga } = getSelectedRamInfo();
  $("totalHarga").textContent = `Total Harga: ${toRupiah(harga)}`;
}

// 2. Fungsi Reset Input (Tombol Refresh Data)
function refreshInput(){
  const usernameEl=$("username"); 
  const ramEl=$("ram");
  if(usernameEl) usernameEl.value="";
  if(ramEl) ramEl.selectedIndex=0;
  updateTotalHarga(); // Reset harga display
  alert("Input username dan pilihan panel berhasil di-reset.");
}

// Panggil saat halaman dimuat
function loadSavedQris() {
    const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
    if (!savedQris) return;

    try {
        const qrisData = JSON.parse(savedQris);
        const now = Date.now();
        // Asumsi QRIS berlaku 30 menit (1800000 ms).
        // Sesuaikan jika masa berlaku QRIS Anda berbeda.
        if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < now) {
            localStorage.removeItem(global.CURRENT_QRIS_KEY);
            return;
        }

        $("qrisImage").src = qrisData.qrUrl;
        $("detailPembayaran").textContent = qrisData.detailText;
        $("qrisSection").classList.remove("hidden");
        $("btnBatal").classList.remove("hidden");
        
        // Lanjutkan pengecekan mutasi
        mulaiCekMutasi(qrisData.paymentId, qrisData.username, qrisData.harga);

    } catch(e) {
        console.error("Gagal memuat QRIS tersimpan:", e);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
    }
}

// QRIS REAL
async function buatQris(){
  const username=$("username").value.trim();
  const { harga: ramHarga, namaPaket: ramNama } = getSelectedRamInfo();
  const ramValue = ramHarga;

  if(!username){ alert("Username tidak boleh kosong."); return; }
  if(ramValue <= 0){ alert("Pilih paket RAM terlebih dahulu."); return; }

  const loadingText=$("loadingText");
  const qrisSection=$("qrisSection");
  const btnBatal=$("btnBatal");

  loadingText.classList.remove("hidden");

  try{
    // Cek apakah ada sesi QRIS yang sedang berjalan
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
      `Paket     : ${ramNama} (${toRupiah(ramHarga)})\n`+ // Tampilkan nama paket & harga
      `Waktu     : ${waktu}`;
      
    $("detailPembayaran").textContent = detailText;

    // 3. Simpan status QRIS ke Local Storage (untuk menghindari hapus data saat refresh)
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

  // Pastikan interval sebelumnya dibersihkan
  if (mutasiInterval) clearInterval(mutasiInterval);

  mutasiInterval = setInterval(async()=>{
    counter++;

    try{
      const url=`${global.qrisBaseUrl}/orderkuota/mutasiqr?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}`;
      const res=await fetch(url);
      const data=await res.json();

      if(data.result){
        const found=data.result.find(tx=>{
          // Menggunakan ramHarga (total harga) untuk pengecekan nominal
          const nominal=parseInt(tx.kredit.replace(/\./g,"")); 
          return tx.status==="IN" && nominal==ramHarga;
        });

        if(found){
          clearInterval(mutasiInterval);
          localStorage.removeItem(global.CURRENT_QRIS_KEY); // Hapus sesi QRIS
          simpanRiwayat({id:paymentId,username,paket:ramHarga,waktu:new Date().toLocaleString("id-ID"), status: "Sukses"});
          alert("Pembayaran diterima! Membuat server...");
          buatServerPTLA(username,ramHarga);
          batalQris(); // Sembunyikan QRIS setelah sukses
          return;
        }
      }

      if(counter>=maxCheck){
        clearInterval(mutasiInterval);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        alert("Waktu pembayaran habis.");
        batalQris(); // Sembunyikan QRIS setelah waktu habis
      }

    }catch(e){ 
        // Lakukan pengecekan waktu habis jika ada error API
        const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
        if (savedQris) {
            const qrisData = JSON.parse(savedQris);
            if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < Date.now()) {
                clearInterval(mutasiInterval);
                localStorage.removeItem(global.CURRENT_QRIS_KEY);
                alert("Waktu pembayaran habis (dideteksi setelah error API).");
                batalQris();
            }
        }
        console.error(e); 
    }
  },10000);
}

// PTLA CREATE SERVER (Tidak ada perubahan di sini)
async function buatServerPTLA(username,ram){
  try{
    const payload={
      server_name:username,
      ram:ram*1000,
      disk:2000,
      cpu:100,
      user:username
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
      alert("Pembayaran sukses, tetapi gagal membuat server.");
      return;
    }

    alert("Server berhasil dibuat!");

  }catch(e){
    console.error(e);
    alert("Gagal membuat server.");
  }
}

function batalQris(){
  // Hentikan pengecekan mutasi
  if (mutasiInterval) clearInterval(mutasiInterval);
  // Hapus dari local storage
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
    return Array.isArray(p)?p:[];
  }catch{return [];}
}

function simpanRiwayat(d){
  const l=getRiwayat(); 
  l.push(d);
  localStorage.setItem(global.STORAGE_KEY,JSON.stringify(l));
}

// 5. Render Riwayat di Modal (Popup)
function renderRiwayat(){
  const c=$("riwayatList");
  const list=getRiwayat();
  if(!list.length){
    c.innerHTML='<p class="riwayat-empty">Belum ada transaksi yang sukses.</p>'; return;
  }
  c.innerHTML="";
  list.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  list.forEach(item=>{
    const div=document.createElement("div");
    div.className="riwayat-item";
    
    // Tampilkan Harga dalam format Rupiah
    const paketText = item.paket ? `${toRupiah(item.paket)}` : 'N/A'; 
    const ramName = getRamNameByValue(item.paket);
    
    div.innerHTML=
      `<div class='riwayat-item-title'>Panel ${ramName}</div>`+
      `<div class='riwayat-item-meta'>💰 Harga: ${paketText}</div>`+
      `<div class='riwayat-item-meta'>👤 Username: ${item.username}</div>`+
      `<div class='riwayat-item-meta'>🕒 Waktu: ${item.waktu}</div>`+
      `<div class='riwayat-item-meta'>🆔 ID Transaksi: ${item.id}</div>`+
      `<div class='riwayat-item-meta'>✅ Status: ${item.status || "Sukses"}</div>`;
    c.appendChild(div);
  });
}

// Fungsi bantu untuk mendapatkan nama RAM dari harganya
function getRamNameByValue(value) {
    switch(value) {
        case 10000: return "1 GB";
        case 20000: return "2 GB";
        case 30000: return "3 GB";
        case 40000: return "4 GB";
        default: return "N/A";
    }
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
                                    
