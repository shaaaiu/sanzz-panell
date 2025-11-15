function $(x){return document.getElementById(x);}

function resetForm(){
 $("username").value="";
 $("ram").selectedIndex=0;
}

function buatQris(){
 $("loading").classList.remove("hidden");
 setTimeout(()=>{
   $("loading").classList.add("hidden");
   $("qrisSection").classList.remove("hidden");
   $("qrisImage").src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TEST";
   let data={
     id:Math.random().toString(36).substring(2),
     username:$("username").value,
     ram:$("ram").value,
     waktu:new Date().toLocaleString()
   };
   $("detail").textContent=JSON.stringify(data,null,2);
   simpanRiwayat(data);
   tampilRiwayat();
 },1200);
}

function batalQris(){
 $("qrisSection").classList.add("hidden");
 $("qrisImage").src="";
 $("detail").textContent="";
}

function simpanRiwayat(data){
 let list=JSON.parse(localStorage.getItem("riwayat")||"[]");
 list.push(data);
 localStorage.setItem("riwayat",JSON.stringify(list));
}

function tampilRiwayat(){
 let list=JSON.parse(localStorage.getItem("riwayat")||"[]");
 $("riwayat").textContent=JSON.stringify(list,null,2);
}

window.onload=tampilRiwayat;
