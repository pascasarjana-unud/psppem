(function () {

"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const URL =
"https://script.google.com/macros/s/AKfycbwj-BbjdPy0HX_XIFajLCsvK2vYNJzu9Cu2AwOK5DjTfHYT0nwKYCNMlu9j7nEMJ8IQow/exec";


const STATE = {

  data: [],

  dosen: [],

  loaded: false,

  currentStudent: null

};


const $ = id =>
document.getElementById(id);



/* =========================================================
   HELPER
   ========================================================= */

function esc(value){

  return String(value ?? "")
  .replace(/[&<>"']/g, function(char){

    return {

      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"

    }[char];

  });

}


function text(value){

  return String(value ?? "")
  .trim();

}



function setStatus(message,type="info"){

  const el =
  $("psppemStatus");

  if(!el) return;


  el.style.display =
  message ? "block" : "none";


  el.className =
  "psppem-status";


  if(type==="success"){

    el.classList.add(
      "is-success"
    );

  }

  else if(type==="error"){

    el.classList.add(
      "is-error"
    );

  }

  else{

    el.classList.add(
      "is-info"
    );

  }


  el.textContent =
  message || "";

}



/* =========================================================
   JSONP GET
   ========================================================= */

function jsonp(params){

return new Promise(
(resolve,reject)=>{


const callback =
"psppem_" +
Date.now() +
Math.random()
.toString(16)
.slice(2);



const script =
document.createElement(
"script"
);


const timeout =
setTimeout(
()=>{

cleanup();

reject(
new Error(
"Koneksi timeout."
)
);

},
15000
);



function cleanup(){

clearTimeout(timeout);

delete window[callback];

script.remove();

}



window[callback] =
response=>{

cleanup();

resolve(response);

};



params.callback =
callback;



script.src =
URL +
"?" +
new URLSearchParams(params)
.toString();



script.onerror =
()=>{

cleanup();

reject(
new Error(
"Gagal menghubungi server."
)
);

};



document.head.appendChild(
script
);


});

}



/* =========================================================
   LOAD MAHASISWA
   ========================================================= */

async function loadData(){


setStatus(
"Memuat data mahasiswa..."
);


const response =
await jsonp({});


if(
response.result !==
"success"
){

throw new Error(
response.message ||
"Gagal memuat data."
);

}



STATE.data =
response.data || [];


STATE.loaded =
true;



loadAngkatan();


setStatus(
"Data berhasil dimuat.",
"success"
);


}



/* =========================================================
   LOAD DOSEN
   ========================================================= */

async function loadDosen(){


if(
STATE.dosen.length
){

return STATE.dosen;

}



const response =
await jsonp({

action:"getDosen"

});



if(
response.result !==
"success"
){

throw new Error(
response.message ||
"Gagal mengambil data dosen."
);

}



STATE.dosen =
response.data || [];



return STATE.dosen;

}



/* =========================================================
   ANGKATAN FILTER
   ========================================================= */

function loadAngkatan(){


const select =
$("psppemAngkatan");


if(!select) return;



const values =
[
...new Set(
STATE.data
.map(item =>
text(item.angkatan)
)
.filter(Boolean)
)

]
.sort();



select.innerHTML =

`
<option value="">
Semua Angkatan
</option>

`;


values.forEach(value=>{


select.innerHTML +=

`
<option value="${esc(value)}">
${esc(value)}
</option>

`;


});


}



/* =========================================================
   SEARCH
   ========================================================= */

function searchData(){


const keyword =
text(
$("psppemSearch")?.value
)
.toLowerCase();



const angkatan =
text(
$("psppemAngkatan")?.value
);



return STATE.data.filter(
student=>{


const matchAngkatan =
!angkatan ||
student.angkatan === angkatan;



const source =

[
student.nama,
student.nim,
student.pembimbing1,
student.nip1,
student.pembimbing2,
student.nip2,
student.pembimbing3,
student.nip3

]
.join(" ")
.toLowerCase();



const matchKeyword =
!keyword ||
source.includes(
keyword
);



return (
matchAngkatan &&
matchKeyword
);


});

}



/* =========================================================
   RENDER CARD
   ========================================================= */

function renderData(){


const container =
$("psppemData");


const resultArea =
$("psppemResultArea");


if(!container) return;



const data =
searchData();



if(resultArea){

resultArea.style.display =
"block";

}



if($("psppemTotal")){

$("psppemTotal")
.textContent =
data.length;

}



if(
!data.length
){

container.innerHTML =

`
<div class="psppem-empty">

<h3>
Data tidak ditemukan
</h3>

<p>
Tidak ada mahasiswa yang sesuai.
</p>

</div>
`;

return;

}



container.innerHTML =

`

<div class="psppem-student-list">

${

data.map(student=>`

<div class="psppem-student-card">


<div class="psppem-student-head">


<div>

<h3 class="psppem-student-name">

${esc(student.nama)}

</h3>


<div class="psppem-student-meta">

NIM:
<strong>
${esc(student.nim)}
</strong>

</div>


<div class="psppem-student-meta">

Angkatan:
<strong>
${esc(student.angkatan)}
</strong>

</div>


</div>


<span class="psppem-angkatan-badge">

${esc(student.angkatan || "-")}

</span>


</div>


<div class="psppem-advisor-grid">


<div class="psppem-advisor">

<span class="psppem-advisor-label">

Pembimbing I

</span>


<div class="psppem-advisor-name">

${esc(student.pembimbing1)||"-"}

</div>


<div class="psppem-advisor-nip">

${esc(student.nip1)}

</div>


</div>



<div class="psppem-advisor">

<span class="psppem-advisor-label">

Pembimbing II

</span>


<div class="psppem-advisor-name">

${esc(student.pembimbing2)||"-"}

</div>


<div class="psppem-advisor-nip">

${esc(student.nip2)}

</div>


</div>


</div>


${renderExamInfo(student)}


</div>

`).join("")

}

</div>

`;

}



/* =========================================================
   PUBLIC ACTION
   ========================================================= */

window.psppemShowData =
async function(){


try{


if(!STATE.loaded){

await loadData();

}



renderData();



}
catch(error){

setStatus(
error.message,
"error"
);


}

};



window.psppemSearchChanged =
function(){

if(
STATE.loaded
){

renderData();

}

};



$("psppemAngkatan")
?.addEventListener(
"change",
function(){

renderData();

}
);

/* =========================================================
   POST DATA KE APPS SCRIPT
   ========================================================= */

function postData(data){

return new Promise(
(resolve,reject)=>{


const requestId =
"req_" +
Date.now() +
Math.random()
.toString(16)
.slice(2);



const iframe =
document.createElement(
"iframe"
);


const form =
document.createElement(
"form"
);



let finished =
false;



const timeout =
setTimeout(
()=>{

cleanup();

reject(
new Error(
"Penyimpanan timeout."
)
);

},
20000
);



function cleanup(){

clearTimeout(timeout);

window.removeEventListener(
"message",
listener
);

iframe.remove();

form.remove();

}



function done(result){

if(finished)
return;


finished=true;

cleanup();

resolve(result);

}



function listener(event){


const data =
event.data;



if(
data &&
data.channel ===
"psppem" &&
data.requestId ===
requestId
){

done(data);

}

}



window.addEventListener(
"message",
listener
);



iframe.name =
requestId;


iframe.hidden =
true;



form.method =
"POST";


form.action =
URL;


form.target =
requestId;



data.requestId =
requestId;



Object.keys(data)
.forEach(key=>{


const input =
document.createElement(
"input"
);


input.type =
"hidden";


input.name =
key;


input.value =
data[key] ?? "";


form.appendChild(
input
);


});



document.body.appendChild(
iframe
);


document.body.appendChild(
form
);



form.submit();



});

}



/* =========================================================
   OPEN ADD MAHASISWA MODAL
   ========================================================= */

window.psppemOpenAddModal =
async function(){


try{


await loadDosen();



const modal =
$("psppemAddModal");

if(!modal)
return;



modal.classList.add(
"is-open"
);



modal.setAttribute(
"aria-hidden",
"false"
);



document.documentElement
.classList.add(
"psppem-modal-open"
);


document.body
.classList.add(
"psppem-modal-open"
);



resetAddForm();



}
catch(error){

setStatus(
error.message,
"error"
);

}


};



window.psppemCloseAddModal =
function(){


const modal =
$("psppemAddModal");


if(!modal)
return;



modal.classList.remove(
"is-open"
);



modal.setAttribute(
"aria-hidden",
"true"
);



document.documentElement
.classList.remove(
"psppem-modal-open"
);


document.body
.classList.remove(
"psppem-modal-open"
);



};



function resetAddForm(){


[
"psppemAddNama",
"psppemAddNim",
"psppemAddAngkatan",
"psppemAddNip1",
"psppemAddNip2",
"psppemAddPassword"

]
.forEach(id=>{


const el =
$(id);


if(el)
el.value="";


});



[
"psppemAddPembimbing1",
"psppemAddPembimbing2"

]
.forEach(id=>{


const el =
$(id);


if(el)
el.value="";


});


}



/* =========================================================
   LOAD DOSEN KE FORM TAMBAH
   ========================================================= */

function fillDosenSelect(
id
){


const select =
$(id);


if(!select)
return;



select.innerHTML =

`
<option value="">
Pilih dosen pembimbing
</option>
`;



STATE.dosen
.forEach(dosen=>{


const option =
document.createElement(
"option"
);


option.value =
dosen.sourceRow;


option.textContent =
dosen.nama;


option.dataset.nip =
dosen.nip;


option.dataset.nama =
dosen.nama;



select.appendChild(
option
);



});


}



async function prepareAddForm(){


await loadDosen();



fillDosenSelect(
"psppemAddPembimbing1"
);


fillDosenSelect(
"psppemAddPembimbing2"
);


}



function updateNip(
number
){


const select =
$(
"psppemAddPembimbing" +
number
);



const nip =
$(
"psppemAddNip" +
number
);



if(
!select ||
!nip
)
return;



const option =
select.options[
select.selectedIndex
];



nip.value =
option?.dataset?.nip ||
"";


}



/* =========================================================
   PEMBIMBING CHANGE
   ========================================================= */

window.psppemDosenChanged =
function(number){

updateNip(number);

};



/* =========================================================
   SUBMIT TAMBAH MAHASISWA
   ========================================================= */

window.psppemSubmitStudent =
async function(event){


event.preventDefault();



const p1 =
$("psppemAddPembimbing1");


const p2 =
$("psppemAddPembimbing2");



const d1 =
p1.options[
p1.selectedIndex
];


const d2 =
p2.options[
p2.selectedIndex
];



const payload = {


action:
"addStudent",


nama:
text(
$("psppemAddNama").value
),


nim:
text(
$("psppemAddNim").value
),


angkatan:
text(
$("psppemAddAngkatan").value
),


pembimbing1Row:
p1.value,


pembimbing1:
d1?.dataset?.nama || "",


nip1:
d1?.dataset?.nip || "",


pembimbing2Row:
p2.value,


pembimbing2:
d2?.dataset?.nama || "",


nip2:
d2?.dataset?.nip || "",


password:
$("psppemAddPassword")
.value


};



if(
!payload.nama ||
!payload.nim ||
!payload.angkatan ||
!payload.password
){

showAddMessage(
"Nama, NIM, angkatan, dan password wajib diisi.",
true
);

return;

}



try{


toggleAddButton(true);



const response =
await postData(
payload
);



if(
response.result !==
"success"
){

throw new Error(
response.message ||
"Gagal menyimpan."
);

}



showAddMessage(
response.message,
false
);



STATE.loaded =
false;



await loadData();



renderData();



setTimeout(
()=>{

psppemCloseAddModal();

},
1200
);



}
catch(error){


showAddMessage(
error.message,
true
);



}
finally{


toggleAddButton(false);



}


};



function showAddMessage(
message,
error
){


const box =
$("psppemAddMessage");


if(!box)
return;



box.style.display =
"block";


box.className =
"psppem-modal-message " +
(
error
?
"is-error"
:
"is-success"
);



box.textContent =
message;


}



function toggleAddButton(
loading
){


const button =
$("psppemAddSubmit");


if(!button)
return;



button.disabled =
loading;



button.textContent =
loading
?
"Menyimpan..."
:
"Simpan Mahasiswa";


}



/* =========================================================
   PREPARE FORM WHEN OPEN
   ========================================================= */


const originalOpenAdd =
window.psppemOpenAddModal;


window.psppemOpenAddModal =
async function(){


await prepareAddForm();


return originalOpenAdd();


};

/* =========================================================
   FORMAT TANGGAL UJIAN
   ========================================================= */

function formatTanggalUjian(value){

    if(!value){
        return "-";
    }


    const date =
    new Date(value);



    if(isNaN(date)){
        return value;
    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day:"2-digit",
            month:"long",
            year:"numeric"
        }
    );

}



/* =========================================================
   STATUS UJIAN CARD
   ========================================================= */

function renderExamInfo(student){


if(!student.pembimbing3){


return `

<div class="psppem-exam-box empty">


<div>

<span class="psppem-advisor-label">
JADWAL UJIAN
</span>


<p>
Belum ada jadwal ujian.
</p>


</div>


${addExamButton(student)}


</div>

`;

}



return `

<div class="psppem-exam-box">


<span class="psppem-advisor-label">
PENGUJI
</span>


<div class="psppem-advisor-name">

${esc(student.pembimbing3)}

</div>


<div class="psppem-advisor-nip">

NIP ${esc(student.nip3)}

</div>



<hr>



<span class="psppem-advisor-label">
JADWAL UJIAN
</span>



<div class="psppem-exam-schedule">


<div>

<strong>
Hari & Tanggal
</strong>


<p>
${esc(student.hari)},
${formatTanggalUjian(student.tanggal)}
</p>

</div>



<div>

<strong>
Jam
</strong>


<p>
${esc(student.jam)}
</p>

</div>



<div>

<strong>
Ruangan
</strong>


<p>
${esc(student.ruangan)}
</p>

</div>


</div>



${addExamButton(student)}



</div>

`;

}



/* =========================================================
   LABEL BUTTON UJIAN
   ========================================================= */

function examButtonLabel(student){


    return student.pembimbing3

    ? "Edit Ujian"

    : "Jadwal Ujian";


}
   
/* =========================================================
   FITUR UJIAN
   ========================================================= */


function addExamButton(student){


return `

<div class="psppem-exam-action">

<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemOpenUjianModal('${student.sourceRow}')">


<span class="psppem-button-icon">

<svg viewBox="0 0 24 24">

<path fill="currentColor"
d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 14h-2v-2h2v2Zm2-5h-4V7h4v5Z"/>

</svg>

</span>


${student.pembimbing3 ? "Edit Ujian" : "Jadwal Ujian"}


</button>

</div>

`;

}



/* =========================================================
   OPEN MODAL UJIAN
   ========================================================= */


window.psppemOpenUjianModal =
async function(sourceRow){


try{


const student =
STATE.data.find(
item =>
String(item.sourceRow) ===
String(sourceRow)
);



if(!student){

throw new Error(
"Data mahasiswa tidak ditemukan."
);

}



STATE.currentStudent =
student;



const modal =
$("psppemUjianModal");



if(!modal)
return;



$("psppemUjianStudentInfo")
.textContent =

`
${student.nama}
 | NIM ${student.nim}
`;



resetUjianForm();


await loadDosen();

fillUjianDosen();


fillExistingExam(student);



modal.classList.add(
"is-open"
);



modal.setAttribute(
"aria-hidden",
"false"
);



document.documentElement
.classList.add(
"psppem-modal-open"
);


document.body
.classList.add(
"psppem-modal-open"
);



}
catch(error){

setStatus(
error.message,
"error"
);

}


};



window.psppemCloseUjianModal =
function(){


const modal =
$("psppemUjianModal");


if(!modal)
return;



modal.classList.remove(
"is-open"
);



modal.setAttribute(
"aria-hidden",
"true"
);



document.documentElement
.classList.remove(
"psppem-modal-open"
);


document.body
.classList.remove(
"psppem-modal-open"
);



};



function resetUjianForm(){


[
"psppemUjianHari",
"psppemUjianTanggal",
"psppemUjianJam",
"psppemUjianRuangan",
"psppemUjianNip",
"psppemUjianNamaLainnya",
"psppemUjianNipLainnya",
"psppemUjianPassword"

]
.forEach(id=>{


const el =
$(id);


if(el)
el.value="";


});



const other =
$("psppemUjianOtherFields");


if(other){

other.style.display =
"none";

}



}



/* =========================================================
   LOAD DOSEN UJIAN
   ========================================================= */


function fillUjianDosen(){


const select =
$("psppemUjianPenguji");



if(!select)
return;



select.innerHTML =

`
<option value="">
Pilih Penguji
</option>

<option value="LAINNYA">
Penguji Eksternal
</option>

`;



STATE.dosen
.forEach(dosen=>{


const option =
document.createElement(
"option"
);


option.value =
dosen.sourceRow;


option.textContent =
dosen.nama;


option.dataset.nama =
dosen.nama;


option.dataset.nip =
dosen.nip;



select.appendChild(
option
);


});



}

function fillExistingExam(student){

    if(!student)
    return;


    $("psppemUjianHari").value =
    student.hari || "";


    $("psppemUjianTanggal").value =
    student.tanggal || "";


    $("psppemUjianJam").value =
    student.jam || "";


    $("psppemUjianRuangan").value =
    student.ruangan || "";


    if(student.pembimbing3){

        const select =
        $("psppemUjianPenguji");


        const option =
        [
            ...select.options
        ]
        .find(
            item =>
            item.textContent.trim()
            ===
            student.pembimbing3
        );


        if(option){

            select.value =
            option.value;


            $("psppemUjianNip").value =
            student.nip3 || "";

        }

    }

}

/* =========================================================
   PILIH PENGUJI
   ========================================================= */


window.psppemUjianPengujiChanged =
function(){


const select =
$("psppemUjianPenguji");



const nip =
$("psppemUjianNip");



const other =
$("psppemUjianOtherFields");



const option =
select.options[
select.selectedIndex
];



if(
select.value ===
"LAINNYA"
){


other.style.display =
"grid";


nip.value =
"";


}

else{


other.style.display =
"none";


nip.value =
option?.dataset?.nip ||
"";


}


};




/* =========================================================
   HARI OTOMATIS
   ========================================================= */


$("psppemUjianTanggal")
?.addEventListener(
"change",
function(){


if(!this.value)
return;



const date =
new Date(
this.value
);



const hari = [

"Minggu",
"Senin",
"Selasa",
"Rabu",
"Kamis",
"Jumat",
"Sabtu"

];



$("psppemUjianHari")
.value =
hari[
date.getDay()
];



}
);




/* =========================================================
   SUBMIT UJIAN
   ========================================================= */


window.psppemSubmitUjian =
async function(event){


event.preventDefault();



const student =
STATE.currentStudent;



if(!student){

return;

}



const select =
$("psppemUjianPenguji");



const option =
select.options[
select.selectedIndex
];



let payload = {


action:
"saveExam",


sourceRow:
student.sourceRow,


nama:
student.nama,


nim:
student.nim,


hari:
$("psppemUjianHari").value,


tanggal:
$("psppemUjianTanggal").value,


jam:
$("psppemUjianJam").value,


ruangan:
$("psppemUjianRuangan").value,


pengujiType:
"",

pengujiRow:
"",


penguji:
"",


nipPenguji:
"",


password:
$("psppemUjianPassword").value


};



if(
select.value ===
"LAINNYA"
){


payload.pengujiType =
"lainnya";


payload.penguji =
text(
$("psppemUjianNamaLainnya").value
);



payload.nipPenguji =
text(
$("psppemUjianNipLainnya").value
);



}

else{


payload.pengujiType =
"dosen";


payload.pengujiRow =
select.value;


payload.penguji =
option?.dataset?.nama ||
"";


payload.nipPenguji =
option?.dataset?.nip ||
"";


}



try{


toggleUjianButton(true);



const response =
await postData(
payload
);



if(
response.result !==
"success"
){

throw new Error(
response.message ||
"Gagal menyimpan ujian."
);

}



setStatus(
response.message,
"success"
);



STATE.loaded =
false;



await loadData();



renderData();



setTimeout(
()=>{

psppemCloseUjianModal();

},
1000
);



}
catch(error){


showUjianMessage(
error.message,
true
);



}
finally{


toggleUjianButton(false);


}



};




function showUjianMessage(
message,
error
){


const box =
$("psppemUjianMessage");



if(!box)
return;



box.style.display =
"block";



box.className =
"psppem-modal-message " +
(
error
?
"is-error"
:
"is-success"
);



box.textContent =
message;


}




function toggleUjianButton(
loading
){


const button =
$("psppemUjianSubmit");



if(!button)
return;



button.disabled =
loading;



button.textContent =
loading
?
"Menyimpan..."
:
"Simpan Data Ujian";


}

/* =========================================================
   RESET TAMPILAN
   ========================================================= */

window.psppemResetDisplay =
function(){


    const search =
    $("psppemSearch");


    const angkatan =
    $("psppemAngkatan");


    if(search){

        search.value = "";

    }


    if(angkatan){

        angkatan.value = "";

    }



    const resultArea =
    $("psppemResultArea");


    if(resultArea){

        resultArea.style.display =
        "none";

    }



    const container =
    $("psppemData");


    if(container){

        container.innerHTML = "";

    }



    if($("psppemTotal")){

        $("psppemTotal")
        .textContent = "0";

    }



    setStatus(
        "",
        "info"
    );


};
   
})();
