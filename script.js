// GLOBAL CONFIG (MOHON GANTI NILAI DENGAN API KEY DAN TOKEN ANDA YANG BENAR)
const global = {
  domain: "https://mikudevprivate.pteropanelku.biz.id",
  apikey: "ptla_7gss1IvRmWISvixYyZ4fEQgPD6wLvakmAeZMyoT9HFQ", // API PTERODACTYL
  nestid: "5",
  egg: "15",
  loc: "1",
  
  // --- KONFIGURASI UNTUK API QRIS BARU (https://apii.ryuuxiao.biz.id) ---
  qrisBaseUrl: "https://apii.ryuuxiao.biz.id", // Base URL API Baru
  qrisApiToken: "RyuuXiao", // Ganti dengan Apikey yang benar untuk API Baru
  qrisUsername: "adjie22", // Ganti dengan Username yang benar untuk API Baru
  qrisOrderToken: "1451589:fsoScMnGEp6kjIQav2L7l0ZWgd1NXVer", // Ganti dengan Token yang benar untuk API Baru
};

function $(id){return document.getElementById(id);}

function resetForm(){
  const usernameEl=$("username"); const ramEl=$("ram");
  if(usernameEl) usernameEl.value="";
  if(ramEl) ramEl.selectedIndex=0;
}

// QRIS REAL
async function buatQris(){
  const username=$("username").value.trim();
  const ram=$("ram").value;

  if(!username){ alert("Username tidak boleh kosong."); return; }

  const loadingText=$("loadingText");
  const qrisSection=$("qrisSection");
  const btnBatal=$("btnBatal");

  loadingText.classList.remove("hidden");

  try{
    // === URL API QRIS BARU ===
    const url=`${global.qrisBaseUrl}/orderkuota/createpayment?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}&amount=${ram}`;
    const res=await fetch(url);
    const data=await res.json();
    // ========================

    loadingText.classList.add("hidden");

    if(!data.status || !data.result || !data.result.imageqris){
      console.error("Gagal membuat QRIS. Respons API:", data);
      alert("Gagal membuat QRIS."); return;
    }

    const qrUrl=data.result.imageqris.url;
    const paymentId=data.result.trx_id || Math.random().toString(36).substring(2);

    qrisSection.classList.remove("hidden");
    btnBatal.classList.remove("hidden");

    $("qrisImage").src=qrUrl;

    const waktu=new Date().toLocaleString("id-ID");
    $("detailPembayaran").textContent =
      "INFORMASI PEMBAYARAN\n"+
      `ID        : ${paymentId}\n`+
      `Username  : ${username}\n`+
      `Paket     : ${ram}\n`+
      `Waktu     : ${waktu}`;

    simpanRiwayat({id:paymentId,username,paket:ram,waktu});

    mulaiCekMutasi(paymentId,username,ram);

  }catch(err){
    console.error(err);
    loadingText.classList.add("hidden");
    alert("Terjadi kesalahan membuat QRIS.");
  }
}

// AUTO MUTASI
async function mulaiCekMutasi(paymentId,username,ram){
  let counter=0; const maxCheck=60;

  const interval=setInterval(async()=>{
    counter++;

    try{
      // === URL MUTASI API QRIS BARU ===
      const url=`${global.qrisBaseUrl}/orderkuota/mutasiqr?apikey=${global.qrisApiToken}&username=${global.qrisUsername}&token=${global.qrisOrderToken}`;
      const res=await fetch(url);
      const data=await res.json();
      // ==============================

      if(data.result){
        const found=data.result.find(tx=>{
          const nominal=parseInt(tx.kredit.replace(/\./g,""));
          return tx.status==="IN" && nominal==ram;
        });

        if(found){
          clearInterval(interval);
          alert("Pembayaran diterima! Membuat server...");
          buatServerPTLA(username,ram);
        }
      }

      if(counter>=maxCheck){
        clearInterval(interval);
        alert("Waktu pembayaran habis.");
      }

    }catch(e){ console.error(e); }
  },10000);
}

// PTLA CREATE SERVER
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
  $("qrisSection").classList.add("hidden");
  $("btnBatal").classList.add("hidden");
  $("qrisImage").src="";
  $("detailPembayaran").textContent="";
}

// RIWAYAT
const STORAGE_KEY="riwayat_transaksi_panel";

function getRiwayat(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const p=JSON.parse(raw);
    return Array.isArray(p)?p:[];
  }catch{return [];}
}

function simpanRiwayat(d){
  const l=getRiwayat(); l.push(d);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(l));
}

function renderRiwayat(){
  const c=$("riwayatList");
  const list=getRiwayat();
  if(!list.length){
    c.innerHTML='<p class="riwayat-empty">Belum ada transaksi.</p>'; return;
  }
  c.innerHTML="";
  list.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  list.forEach(item=>{
    const div=document.createElement("div");
    div.className="riwayat-item";
    div.innerHTML=
      `<div class='riwayat-item-title'>Panel ${item.paket}</div>`+
      `<div class='riwayat-item-meta'>👤 ${item.username}</div>`+
      `<div class='riwayat-item-meta'>🕒 ${item.waktu}</div>`+
      `<div class='riwayat-item-meta'>🆔 ${item.id}</div>`;
    c.appendChild(div);
  });
}

function openRiwayat(){ renderRiwayat(); $("riwayatModal").classList.add("show"); }
function closeRiwayat(){ $("riwayatModal").classList.remove("show"); }

// Anti Pull Refresh
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

window.addEventListener("load",setupPullToRefreshBlocker);
