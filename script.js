// GLOBAL CONFIG (Tidak diubah dari jawaban terakhir, hanya memastikan kelengkapan)
const global = {
  domain: "https://panel.xiao-store.web.id",
  apikey: "ptla_ll4q9Ks59PRs0ZviiEa3e5g9x3fbTPPh909arpx9gG1",
  nestid: "5",
  egg: "15",
  loc: "1",
  
  qrisBaseUrl: "https://apii.ryuuxiao.biz.id", 
  qrisApiToken: "RyuuXiao", 
  qrisUsername: "adjie22", 
  qrisOrderToken: "1451589:fsoScMnGEp6kjIQav2L7l0ZWgd1NXVer", 

  CURRENT_QRIS_KEY: "current_qris_session",
  STORAGE_KEY: "riwayat_transaksi_panel",
};

// PACKAGE CONFIG (Tidak diubah dari jawaban terakhir, hanya memastikan kelengkapan)
const PACKAGE_CONFIG = {
  '500':  { nama: '500mb', harga: 500,  memo: 500,  disk: 100, cpu: 30  },
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

// ... (Fungsi Pembantu: toRupiah, getSelectedRamInfo, updateTotalHarga) ...
function toRupiah(number) {
    if (isNaN(number) || number === null) return 'RpN/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number).replace('Rp', 'Rp');
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
// ...

// Fungsi Reset Input (Tombol Refresh Data) - Tidak ada perubahan
function refreshInput(){
  const usernameEl=$("username"); 
  const ramEl=$("ram");
  if(usernameEl) usernameEl.value="";
  if(ramEl) ramEl.selectedIndex=0;
  updateTotalHarga(); 
  alert("Input username dan pilihan panel berhasil di-reset.");
}

// 1. Perbaikan: Muat QRIS yang tersimpan dan isi formulir jika QRIS aktif
function loadSavedQris() {
    const savedQris = localStorage.getItem(global.CURRENT_QRIS_KEY);
    if (!savedQris) return false; // Mengembalikan false jika tidak ada sesi

    try {
        const qrisData = JSON.parse(savedQris);
        const now = Date.now();
        
        if (qrisData.waktuKadaluarsa && qrisData.waktuKadaluarsa < now) {
            localStorage.removeItem(global.CURRENT_QRIS_KEY);
            return false;
        }
        
        // Mengisi kembali formulir saat QRIS aktif
        $("username").value = qrisData.username || '';
        $("ram").value = qrisData.harga ? qrisData.harga.toString() : '';
        updateTotalHarga(); // Update tampilan harga

        $("qrisImage").src = qrisData.qrUrl;
        $("detailPembayaran").textContent = qrisData.detailText;
        $("qrisSection").classList.remove("hidden");
        $("btnBatal").classList.remove("hidden");
        
        mulaiCekMutasi(qrisData.paymentId, qrisData.username, qrisData.harga);
        return true; // Mengembalikan true jika sesi dimuat

    } catch(e) {
        console.error("Gagal memuat QRIS tersimpan:", e);
        localStorage.removeItem(global.CURRENT_QRIS_KEY);
        return false;
    }
}

// ... (Fungsi buatQris, mulaiCekMutasi, buatServerPTLA, batalQris - Tidak ada perubahan) ...
async function buatQris(){
  const username=$("username").value.trim();
  const { harga: ramHarga, nama: ramNama } = getSelectedRamInfo(); 
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
      `Paket     : ${ramNama.toUpperCase()} (${toRupiah(ramHarga)})\n`+ 
      `Waktu     : ${waktu}`;
      
    $("detailPembayaran").textContent = detailText;

    localStorage.setItem(global.CURRENT_QRIS_KEY, JSON.stringify({
        paymentId,
        username,
        harga: ramHarga,
        ramNama,
        qrUrl,
        detailText,
        waktuKadaluarsa: Date.now() + (30 * 60 * 1000) // 30 menit
    }));

    mulaiCekMutasi(paymentId, username, ramHarga);
  
  }catch(err){
    console.error(err);
    loadingText.classList.add("hidden");
    alert("Terjadi kesalahan membuat QRIS.");
  }
}
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
          
          simpanRiwayat({id:paymentId,username,harga:ramHarga,waktu:new Date().toLocaleString("id-ID"), status: "Sukses"});
          
          alert("Pembayaran diterima! Membuat server...");
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
async function buatServerPTLA(username, ramHarga){
  const config = PACKAGE_CONFIG[ramHarga.toString()];

  if (!config) {
    alert("Gagal membuat server: Konfigurasi paket tidak ditemukan.");
    return;
  }
  
  try{
    const payload={
      server_name: username,
      ram: config.memo,     
      disk: config.disk,    
      cpu: config.cpu,      
      user: username
    };
    
    if (config.nama === 'unli') {
        payload.ram = 999999; 
        payload.disk = 999999;
        payload.cpu = 100;
    }


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
  // Reset input setelah QRIS dibatalkan/selesai
  refreshInput(); 
  alert("Pembayaran QRIS dibatalkan.");
}

// ... (Fungsi Riwayat - Tidak ada perubahan) ...
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
    
    const div=document.createElement("div");
    div.className="riwayat-item";
    div.innerHTML=
      `<div class='riwayat-item-title'>Panel ${paketNama}</div>`+
      `<div class='riwayat-item-meta'>💰 Harga: ${hargaText}</div>`+
      `<div class='riwayat-item-meta'>👤 Username: ${item.username}</div>`+
      `<div class='riwayat-item-meta'>🕒 Waktu: ${item.waktu}</div>`+
      `<div class='riwayat-item-meta'>🆔 ID Transaksi: ${item.id}</div>`+
      `<div class='riwayat-item-meta'>✅ Status: ${item.status || "Sukses"}</div>`+
      `<button class="btn-delete" onclick="hapusRiwayat('${item.uniqueId}')">Hapus</button>`; 
    c.appendChild(div);
  });
}

function hapusRiwayat(uniqueId) {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat ini?")) return;

    const list = getRiwayat().filter(item => item.uniqueId !== uniqueId);
    localStorage.setItem(global.STORAGE_KEY, JSON.stringify(list));
    
    renderRiwayat(); 
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
    
    // 1. Logika muat QRIS yang diperbaiki:
    const qrisActive = loadSavedQris(); 
    
    // Jika tidak ada QRIS aktif, baru inisialisasi input (agar tidak me-reset input yang sudah terisi)
    if (!qrisActive) {
        // Cek apakah ada nilai di URL atau default lainnya di sini jika perlu.
        // Untuk saat ini, kita hanya memastikan updateTotalHarga dipanggil.
        updateTotalHarga(); 
    }
});
