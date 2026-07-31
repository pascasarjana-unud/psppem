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
    currentStudent: null,
    currentPrintStudent: null,
    currentPrintDocument:null,
    currentDocumentHistory:null,
    documentEditMode:false
};
   
/* =========================================================
   MASTER DOKUMEN CETAK
   Tambahkan dokumen baru di sini
   ========================================================= */

const PRINT_DOCUMENTS = [

{
    id:"surat_pembimbing",
    nama:"Surat Permohonan Pembimbing",
    keterangan:"Surat permohonan penetapan pembimbing RPL.",
    templateId:"12xXimKqX665IVIUeG-WaDdexjXPNNad4",
    manualFields:[
        "nomorSurat",
        "tanggalSurat"
    ]
},


{
    id:"surat_penguji",
    nama:"Surat Permohonan Penguji RPL",
    keterangan:"Surat permohonan penetapan penguji RPL.",
    templateId:"1NtoTUOUzJ3A8BYwYHqyeKlpoBdgCucWjUAxzFEQcvvo",
    manualFields:[
        "nomorSurat",
        "tanggalSurat"
    ]
},


{
    id:"surat_undangan",
    nama:"Surat Undangan Menguji",
    keterangan:"Undangan dosen untuk pelaksanaan ujian.",
    templateId:"1lFYJG6QVXk_IHMIvayEmHX_xIvekCHNHmwlPG26xNlM",
    manualFields:[
        "nomorSurat",
        "tanggalSurat"
    ]
},


{
    id:"form_nilai_up",
    nama:"Form Nilai UP Studi Kasus",
    keterangan:"Form penilaian ujian proposal studi kasus.",
    templateId:"1Y1Jo9t3yAyyZldRwzfTMyvkXXKOifCbTKvh0fOonJas",
    manualFields:[]
},


{
    id:"form_nilai_studi",
    nama:"Form Nilai Studi Kasus",
    keterangan:"Form penilaian ujian studi kasus.",
    templateId:"1Wiq5T0Jbqxl22dDI8RpdVSwV7v3xM_InEgo1wt-oWSc",
    manualFields:[]
},


{
    id:"berita_acara",
    nama:"Berita Acara",
    keterangan:"Berita acara pelaksanaan ujian.",
    templateId:"12xXimKqX665IVIUeG-WaDdexjXPNNad4",
    manualFields:[
        "jumlahPengujiHadir",
        "nilaiAkhir",
        "nilaiHuruf"
    ]
}

];
   
const $ = id =>
document.getElementById(id);


/* =========================================================
   HELPER
   ========================================================= */

function esc(value){

    return String(value ?? "")
    .replace(
        /[&<>"']/g,
        function(char){

            return {
                "&":"&amp;",
                "<":"&lt;",
                ">":"&gt;",
                '"':"&quot;",
                "'":"&#39;"
            }[char];

        }
    );

}



function text(value){

    return String(value ?? "")
    .trim();

}



function setStatus(
message,
type="info"
){

    const el =
    $("psppemStatus");


    if(!el)
    return;


    el.style.display =
    message
    ?
    "block"
    :
    "none";


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



if(!select)
return;



const values =
[
...new Set(
STATE.data
.map(item =>
text(item.angkatan)
.toUpperCase()
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
text(student.angkatan)
.toUpperCase()
===
angkatan;



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
   RENDER DATA
   ========================================================= */

function renderData(){


const container =
$("psppemData");


const resultArea =
$("psppemResultArea");



if(!container)
return;



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



if(!data.length){


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



<div class="psppem-student-badge-group">


<span class="psppem-angkatan-badge">

${esc(student.angkatan || "-")}

</span>



<button
type="button"
class="psppem-button psppem-button-edit-small"
onclick="psppemOpenPembimbingModal('${student.sourceRow}')">

Edit

</button>


</div>


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


await loadData();


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


if(STATE.loaded){

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
   POST DATA
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
data.channel === "psppem" &&
data.requestId === requestId
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
   TAMBAH MAHASISWA
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



if(el){

el.value = "";

}

});



[
"psppemAddPembimbing1",
"psppemAddPembimbing2"

]
.forEach(id=>{


const el =
$(id);



if(el){

el.value = "";

}

});


}



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
STATE.dosen.find(
d =>
String(d.sourceRow)
===
String(p1.value)
);



const d2 =
STATE.dosen.find(
d =>
String(d.sourceRow)
===
String(p2.value)
);



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
d1?.nama || "",


nip1:
d1?.nip || "",


pembimbing2Row:
p2.value,


pembimbing2:
d2?.nama || "",


nip2:
d2?.nip || "",


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
   AUTOCOMPLETE DOSEN ENGINE
   ========================================================= */


function psppemSearchDosen(keyword){


keyword =
String(keyword || "")
.toLowerCase()
.trim();



if(!keyword){

return [];

}



return STATE.dosen

.filter(
function(dosen){


const target =
[
dosen.nama,
dosen.nip

]
.join(" ")
.toLowerCase();



return target.includes(
keyword
);



}

)

.slice(
0,
10
);



}



window.psppemRenderDosenSearch =
function(
resultId,
inputId,
hiddenId,
nipId,
keyword
){



const container =
$(resultId);



if(!container)
return;



const result =
psppemSearchDosen(
keyword
);



if(!result.length){


container.innerHTML =
"";


return;


}



container.innerHTML =

result.map(
function(dosen){


return `

<div
class="psppem-dosen-result-item"
onclick="psppemSelectDosen(
'${resultId}',
'${inputId}',
'${hiddenId}',
'${nipId}',
'${dosen.sourceRow}',
'${esc(dosen.nama)}',
'${esc(dosen.nip)}'
)">


<strong>

${esc(dosen.nama)}

</strong>


<small>

${esc(dosen.nip)}

</small>


</div>

`;


}

)

.join("");



};



window.psppemSelectDosen =
function(
resultId,
inputId,
hiddenId,
nipId,
sourceRow,
nama,
nip
){



$(inputId).value =
nama;



$(hiddenId).value =
sourceRow;



$(nipId).value =
nip;



$(resultId).innerHTML =
"";


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
   BUTTON UJIAN
   ========================================================= */

function addExamButton(student){


return `

<div class="psppem-exam-action">

<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemOpenUjianModal('${student.sourceRow}')">

${student.pembimbing3
?
"Edit Ujian"
:
"Jadwal Ujian"}

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
String(item.sourceRow)
===
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
/* =========================================================
   CLOSE MODAL UJIAN
   ========================================================= */

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



/* =========================================================
   RESET FORM UJIAN
   ========================================================= */

function resetUjianForm(){


[
"psppemUjianHari",
"psppemUjianTanggal",
"psppemUjianJam",
"psppemUjianRuangan",
"psppemUjianPenguji",
"psppemUjianPengujiSearch",
"psppemUjianNip",
"psppemUjianNamaLainnya",
"psppemUjianNipLainnya",
"psppemUjianPassword"

]
.forEach(id=>{


const el =
$(id);



if(el){

el.value = "";

}

});



const result =
$("psppemUjianPengujiResult");


if(result){

result.innerHTML =
"";

}



const other =
$("psppemUjianOtherFields");


if(other){

other.style.display =
"none";

}


}



/* =========================================================
   ISI DATA UJIAN LAMA
   ========================================================= */

function fillExistingExam(student){


if(!student)
return;



$("psppemUjianTanggal").value =
student.tanggal || "";



$("psppemUjianJam").value =
student.jam || "";



$("psppemUjianRuangan").value =
student.ruangan || "";



if(student.tanggal){


const date =
new Date(student.tanggal);



const hari =
[
"Minggu",
"Senin",
"Selasa",
"Rabu",
"Kamis",
"Jumat",
"Sabtu"
];



$("psppemUjianHari").value =
hari[date.getDay()];

}



if(student.pembimbing3){


const penguji =
STATE.dosen.find(
d =>
String(d.nama || "").trim()
===
String(student.pembimbing3 || "").trim()
);



if(penguji){


$("psppemUjianPengujiSearch")
.value =
penguji.nama;



$("psppemUjianPenguji")
.value =
penguji.sourceRow;



$("psppemUjianNip")
.value =
penguji.nip;


}


}


}



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
new Date(this.value);



const hari =
[
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
hari[date.getDay()];



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



if(!student)
return;



const pengujiRow =
$("psppemUjianPenguji")
.value;



const pengujiDosen =
STATE.dosen.find(
d =>
String(d.sourceRow)
===
String(pengujiRow)
);



const payload = {


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
pengujiRow ===
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
pengujiRow;


payload.penguji =
pengujiDosen?.nama || "";


payload.nipPenguji =
pengujiDosen?.nip || "";


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
/* =========================================================
   MESSAGE UJIAN
   ========================================================= */

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
   EDIT PEMBIMBING
   ========================================================= */


let CURRENT_PEMBIMBING_ROW =
null;



window.psppemOpenPembimbingModal =
async function(row){


CURRENT_PEMBIMBING_ROW =
row;



const student =
STATE.data.find(
item =>
String(item.sourceRow)
===
String(row)
);



if(!student)
return;



$("psppemPembimbingNama")
.textContent =
student.nama;



$("psppemPembimbingNim")
.textContent =
student.nim;



await loadDosen();



fillPembimbingForm(student);



const password =
$("psppemPembimbingPassword");



if(password){

password.value =
"";

}



const message =
$("psppemPembimbingMessage");



if(message){

message.style.display =
"none";


message.textContent =
"";


message.className =
"psppem-modal-message";

}



$("psppemPembimbingModal")
.classList.add(
"is-open"
);



};



function fillPembimbingForm(student){


const d1 =
STATE.dosen.find(
d =>
String(d.nama || "").trim()
===
String(student.pembimbing1 || "").trim()
);



const d2 =
STATE.dosen.find(
d =>
String(d.nama || "").trim()
===
String(student.pembimbing2 || "").trim()
);



if(d1){


$("psppemEditPembimbing1Search")
.value =
d1.nama;



$("psppemEditPembimbing1")
.value =
d1.sourceRow;



$("psppemEditNip1")
.value =
d1.nip;


}



if(d2){


$("psppemEditPembimbing2Search")
.value =
d2.nama;



$("psppemEditPembimbing2")
.value =
d2.sourceRow;



$("psppemEditNip2")
.value =
d2.nip;


}


}



/* =========================================================
   CLOSE EDIT PEMBIMBING
   ========================================================= */

window.psppemClosePembimbingModal =
function(){


const modal =
$("psppemPembimbingModal");



if(modal){

modal.classList.remove(
"is-open"
);

}



const password =
$("psppemPembimbingPassword");



if(password){

password.value =
"";

}



};



window.psppemPembimbingBackdropClose =
function(event){


if(
event.target.id ===
"psppemPembimbingModal"
){

psppemClosePembimbingModal();

}


};




/* =========================================================
   SUBMIT EDIT PEMBIMBING
   ========================================================= */

window.psppemSubmitPembimbing =
async function(event){


event.preventDefault();



const pembimbing1Row =
$("psppemEditPembimbing1")
.value.trim();



const pembimbing2Row =
$("psppemEditPembimbing2")
.value.trim();



const dosen1 =
STATE.dosen.find(
d =>
String(d.sourceRow)
===
String(pembimbing1Row)
);



const dosen2 =
STATE.dosen.find(
d =>
String(d.sourceRow)
===
String(pembimbing2Row)
);



if(
dosen1 &&
dosen2 &&
dosen1.sourceRow === dosen2.sourceRow
){

return;

}



const payload = {


action:
"updatePembimbing",


sourceRow:
CURRENT_PEMBIMBING_ROW,


pembimbing1:
dosen1?.nama || "",


nip1:
dosen1?.nip || "",


pembimbing2:
dosen2?.nama || "",


nip2:
dosen2?.nip || "",


password:
$("psppemPembimbingPassword")
.value


};



try{


const result =
await postData(
payload
);



if(
result.result !==
"success"
){

throw new Error(
result.message ||
"Gagal memperbarui data."
);

}



STATE.loaded =
false;



await loadData();



renderData();



psppemClosePembimbingModal();


}
catch(error){


setStatus(
error.message,
"error"
);


}


};




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

search.value =
"";

}



if(angkatan){

angkatan.value =
"";

}



const area =
$("psppemResultArea");



if(area){

area.style.display =
"none";

}



const container =
$("psppemData");



if(container){

container.innerHTML =
"";

}



if($("psppemTotal")){

$("psppemTotal")
.textContent =
"0";

}



setStatus(
"",
"info"
);


};

/* =========================================================
   CETAK DOKUMEN MODAL
   ========================================================= */


window.psppemOpenPrintModal =
async function(){


if(!STATE.data.length){

await loadData();

}


const modal =
$("psppemPrintModal");


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



STATE.currentPrintStudent =
null;



$("psppemPrintSearch").value =
"";


$("psppemPrintResult").innerHTML =
"";


$("psppemPrintStudentInfo").innerHTML =

`
Belum ada mahasiswa dipilih.
`;


};

/* FUNGSI TUTUP MODAL */
window.psppemClosePrintModal =
function(){


const modal =
$("psppemPrintModal");


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

/* PENCARIAN MAHASISWA */
window.psppemSearchPrintStudent =
function(keyword){


keyword =
text(keyword)
.toLowerCase();



const container =
$("psppemPrintResult");



if(!container)
return;



if(!keyword){

container.innerHTML =
"";

return;

}



const result =
STATE.data.filter(
student=>{


const source =
[
student.nama,
student.nim

]
.join(" ")
.toLowerCase();



return source.includes(
keyword
);


}

)
.slice(
0,
10
);



container.innerHTML =

result.map(
student=>`

<div
class="psppem-print-result-item"
onclick="psppemSelectPrintStudent('${student.sourceRow}')">


<strong>
${esc(student.nama)}
</strong>


<br>

<small>
NIM:
${esc(student.nim)}
|
Angkatan:
${esc(student.angkatan)}
</small>


</div>

`
)
.join("");



};

/* PILIH MAHASISWA */
window.psppemSelectPrintStudent =
function(sourceRow){


const student =
STATE.data.find(
item =>
String(item.sourceRow)
===
String(sourceRow)
);



if(!student)
return;



STATE.currentPrintStudent =
student;



$("psppemPrintSearch").value =
student.nama;



$("psppemPrintResult").innerHTML =
"";



$("psppemPrintStudentInfo").innerHTML =

`

<h3>
${esc(student.nama)}
</h3>


<p>
NIM:
<strong>
${esc(student.nim)}
</strong>
</p>


<p>
Angkatan:
<strong>
${esc(student.angkatan)}
</strong>
</p>

`;

renderPrintDocuments();

};
/* FUNGSI BACKDROP CLOSE */
window.psppemPrintBackdropClose =
function(event){

if(
event.target.id ===
"psppemPrintModal"
){

psppemClosePrintModal();

}

};

   /* FUNGSI RENDER TOMBOL */
   function renderPrintDocuments(){


const container =
$("psppemPrintDocuments");


if(!container)
return;



container.innerHTML =

PRINT_DOCUMENTS.map(doc=>`


<div class="psppem-print-card">


<div>

<strong>
${doc.nama}
</strong>


<small>
${doc.keterangan}
</small>


</div>



<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemPreparePrint('${doc.id}')">

Cetak

</button>


</div>


`).join("");


}
   /* FUNGSI SEMENTARA TOMBOL */
window.psppemPreparePrint =
async function(docId){


const doc =
PRINT_DOCUMENTS.find(
item =>
item.id === docId
);



if(!doc)
return;

const student =
STATE.currentPrintStudent;


if(!student)
return;

STATE.currentPrintDocument =
doc;

STATE.currentDocumentHistory =
await psppemLoadDocumentHistory(
student.sourceRow,
doc.id
);
   
STATE.currentPrintStudent =
student;

$("psppemDocumentTitle")
.textContent =
doc.nama;



$("psppemDocumentDescription")
.textContent =
doc.keterangan;



renderDocumentFields(doc);

renderDocumentActions();



const modal =
$("psppemDocumentFormModal");


if(modal){

modal.classList.add(
"is-open"
);


modal.setAttribute(
"aria-hidden",
"false"
);

}



};

/* =========================================================
   LOAD RIWAYAT CETAK DOKUMEN
   ========================================================= */


async function psppemLoadDocumentHistory(
sourceRow,
dokumenId
){


try{


const result =
await postData({

action:
"getDocumentHistory",

sourceRow:
sourceRow,

dokumenId:
dokumenId

});



if(
result &&
result.result === "success"
){

return {

found:
result.found,

nomorSurat:
result.data?.nomorSurat || "",

tanggalSurat:
result.data?.tanggalSurat || "",

dataTambahan:
result.data?.dataTambahan || ""

};

}


return {

found:false,

nomorSurat:"",

tanggalSurat:"",

dataTambahan:""

};


}
catch(error){


console.error(
"Load history error",
error
);



return {

found:false,

nomorSurat:"",

tanggalSurat:"",

dataTambahan:""

};


}


}
   
   /* FUNGSI RENDER FIELD OTOMATIS */
   function renderDocumentFields(doc){


const container =
$("psppemDocumentFields");

const history =
STATE.currentDocumentHistory;
      
if(!container)
return;

if(
history &&
history.found
){

container.innerHTML =

`

<div class="psppem-selected-student">

<strong>
Data sebelumnya ditemukan
</strong>


<p>
Nomor Surat:
<br>

${esc(history.nomorSurat || "-")}

</p>


<p>
Tanggal Surat:
<br>

${esc(history.tanggalSurat || "-")}

</p>


<button
type="button"
class="psppem-button psppem-button-secondary"
onclick="psppemEditDocumentHistory()">

Edit Data

</button>


</div>

`;

return;

}

if(
!doc.manualFields ||
!doc.manualFields.length
){


container.innerHTML =

`
<div class="psppem-selected-student">

Dokumen siap dicetak.

</div>
`;

return;

}



container.innerHTML =

doc.manualFields.map(
field=>{


let label =
field;


if(field==="nomorSurat")
label="Nomor Surat";


if(field==="tanggalSurat")
label="Tanggal Surat";


if(field==="jumlahPengujiHadir")
label="Jumlah Penguji Hadir";


if(field==="nilaiAkhir")
label="Nilai Akhir";


if(field==="nilaiHuruf")
label="Nilai Huruf";



return `

<div class="psppem-form-field">


<label>

${label}

</label>


<input
type="text"
data-document-field="${field}"
class="psppem-input"
>


</div>

`;

}

).join("");



}

/* =========================================================
   EDIT DATA RIWAYAT DOKUMEN
   ========================================================= */


window.psppemEditDocumentHistory =
function(){


const doc =
STATE.currentPrintDocument;


if(!doc)
return;



STATE.currentDocumentHistory =
{
found:false,

nomorSurat:
STATE.currentDocumentHistory?.nomorSurat || "",

tanggalSurat:
STATE.currentDocumentHistory?.tanggalSurat || "",

dataTambahan:
STATE.currentDocumentHistory?.dataTambahan || ""

};



renderDocumentFields({

...doc,

manualFields:[
"nomorSurat",
"tanggalSurat"
]

});


};
   
   /* FUNGSI TUTUP MODAL */
   window.psppemCloseDocumentFormModal =
function(){


const modal =
$("psppemDocumentFormModal");


if(!modal)
return;



modal.classList.remove(
"is-open"
);



modal.setAttribute(
"aria-hidden",
"true"
);


};
   
/* =========================================================
   CEK RIWAYAT CETAK DOKUMEN
   ========================================================= */


function psppemCheckDocumentHistory(){

const student =
STATE.currentPrintStudent;


const doc =
STATE.currentPrintDocument;



if(
!student ||
!doc
){

return null;

}



const historyKey =

String(student.sourceRow)
+
"_"
+
String(doc.id);



/*
 sementara dummy
 nanti diganti ambil dari Sheet RiwayatCetak
*/


return {

key:
historyKey,

found:false,

nomorSurat:"",
tanggalSurat:"",

dataTambahan:""

};
}

/* =========================================================
   KUMPULKAN DATA DOKUMEN
   ========================================================= */


function collectDocumentData(){


const fields =
document.querySelectorAll(
"[data-document-field]"
);



const data = {};



fields.forEach(
field=>{


data[
field.dataset.documentField
]
=
field.value.trim();



}
);



return data;


}

/* =========================================================
   SIMPAN RIWAYAT CETAK
   ========================================================= */


async function saveDocumentHistory(){


const student =
STATE.currentPrintStudent;


const doc =
STATE.currentPrintDocument;



if(
!student ||
!doc
){

return;

}



const data =
collectDocumentData();



const payload = {


action:
"saveDocumentHistory",


sourceRow:
student.sourceRow,


dokumenId:
doc.id,


namaDokumen:
doc.nama,


nomorSurat:
data.nomorSurat || "",


tanggalSurat:
data.tanggalSurat || "",


dataTambahan:
JSON.stringify(data)


};



console.log(
"SAVE DOCUMENT HISTORY",
payload
);

const result =
await postData(
payload
);


console.log(
"RESULT SAVE HISTORY",
result
);

}
   
/* TOMBOL CETAK PDF */
window.psppemGeneratePDF =
async function(){


await saveDocumentHistory();


alert(
"Riwayat dokumen tersimpan."
);


};

/* =========================================================
   RENDER AKSI DOKUMEN
   ========================================================= */


function renderDocumentActions(){


const container =
$("psppemDocumentActions");


if(!container)
return;



const history =
STATE.currentDocumentHistory;



if(
history &&
history.found
){

container.innerHTML =

`

<button
type="button"
class="psppem-button psppem-button-secondary"
onclick="psppemEditDocumentHistory()">

Edit

</button>


<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemGeneratePDF()">

Cetak PDF

</button>

`;



return;

}



container.innerHTML =

`

<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemSaveDocumentHistory()">

Simpan

</button>


<button
type="button"
class="psppem-button psppem-button-primary"
onclick="psppemGeneratePDF()">

Cetak PDF

</button>

`;



}
   
})();
