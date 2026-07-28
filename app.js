/* =========================================================
   CONFIG
   ========================================================= */

var PSPPEM_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxGrGkcvfHn4NBBQ7V9AcQa4cnjV6_MmFGxU2qEKyL0fMQc7kDD3qTjQBowYgo5788pjw/exec";


var psppemState = {

  data: [],

  loaded: false,

  loading: false,

  loadingPromise: null

};


var psppemDosenState = {

  data: [],

  loaded: false,

  loading: false,

  loadingPromise: null

};


/*
  Request POST aktif.
  Digunakan untuk mencocokkan response postMessage
  dari hidden iframe Apps Script.
*/
var psppemPostRequests =
  Object.create(null);



/* =========================================================
   UTILITIES
   ========================================================= */

function psppemNormalize(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(/\s+/g, " ")
    .trim();

}



function psppemEscape(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(/&/g, "\x26amp;")
    .replace(/</g, "\x26lt;")
    .replace(/>/g, "\x26gt;")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "\x26#39;");

}



/* =========================================================
   STATUS
   ========================================================= */

function psppemStatus(type, message) {

  var element =
    document.getElementById(
      "psppemStatus"
    );


  if (!element) {
    return;
  }


  element.className =
    "psppem-status is-" +
    type;


  element.textContent =
    message;


  element.style.display =
    "block";

}



function psppemClearStatus() {

  var element =
    document.getElementById(
      "psppemStatus"
    );


  if (!element) {
    return;
  }


  element.className =
    "psppem-status";


  element.textContent =
    "";


  element.style.display =
    "none";

}



/* =========================================================
   SEARCH UI
   ========================================================= */

function psppemSearchChanged() {

  var input =
    document.getElementById(
      "psppemSearch"
    );


  var clear =
    document.getElementById(
      "psppemSearchClear"
    );


  if (
    !input ||
    !clear
  ) {

    return;

  }


  if (
    psppemNormalize(
      input.value
    )
  ) {

    clear.classList.add(
      "is-visible"
    );

  } else {

    clear.classList.remove(
      "is-visible"
    );

  }

}



function psppemClearSearch() {

  var input =
    document.getElementById(
      "psppemSearch"
    );


  var clear =
    document.getElementById(
      "psppemSearchClear"
    );


  if (input) {

    input.value = "";

    input.focus();

  }


  if (clear) {

    clear.classList.remove(
      "is-visible"
    );

  }

}



function psppemSearchKeydown(event) {

  if (
    event.key ===
    "Enter"
  ) {

    event.preventDefault();

    psppemShowData();

  }

}



/* =========================================================
   JSONP
   ========================================================= */

function psppemJsonp(url) {

  return new Promise(
    function(resolve, reject) {


      var callbackName =
        "psppemJsonp_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() *
          100000
        );


      var script =
        document.createElement(
          "script"
        );


      var finished =
        false;


      var timeoutId =
        null;


      function cleanup() {


        if (timeoutId) {

          clearTimeout(
            timeoutId
          );

        }


        if (
          script &&
          script.parentNode
        ) {

          script.parentNode.removeChild(
            script
          );

        }


        try {

          delete window[
            callbackName
          ];

        } catch (error) {

          window[
            callbackName
          ] = undefined;

        }

      }


      window[
        callbackName
      ] =
        function(response) {


          if (finished) {
            return;
          }


          finished =
            true;


          cleanup();


          resolve(
            response || {}
          );

        };


      script.onerror =
        function() {


          if (finished) {
            return;
          }


          finished =
            true;


          cleanup();


          reject(
            new Error(
              "Gagal menghubungi Apps Script."
            )
          );

        };


      var separator =
        url.indexOf("?") === -1
          ? "?"
          : "&";


      script.src =
        url +
        separator +
        "callback=" +
        encodeURIComponent(
          callbackName
        ) +
        "&cacheBust=" +
        Date.now();


      document.body.appendChild(
        script
      );


      timeoutId =
        setTimeout(
          function() {


            if (finished) {
              return;
            }


            finished =
              true;


            cleanup();


            reject(
              new Error(
                "Server tidak merespons dalam 15 detik."
              )
            );


          },
          15000
        );

    }
  );

}



/* =========================================================
   LOAD DATA DOSEN
   ========================================================= */

function psppemSetDosenSelectStatus(text, disabled) {

  [1, 2].forEach(
    function(number) {

      var select =
        document.getElementById(
          "psppemAddPembimbing" + number
        );

      if (!select) {
        return;
      }

      select.innerHTML = "";

      var option =
        document.createElement(
          "option"
        );

      option.value = "";
      option.textContent = text;

      select.appendChild(
        option
      );

      select.disabled =
        Boolean(disabled);

    }
  );

}


function psppemBuildDosenSelects() {

  [1, 2].forEach(
    function(number) {

      var select =
        document.getElementById(
          "psppemAddPembimbing" + number
        );

      if (!select) {
        return;
      }

      var current =
        select.value;

      select.innerHTML = "";
      select.disabled = false;

      var placeholder =
        document.createElement(
          "option"
        );

      placeholder.value = "";
      placeholder.textContent =
        "Pilih dosen pembimbing";

      select.appendChild(
        placeholder
      );

      psppemDosenState.data.forEach(
        function(item) {

          var option =
            document.createElement(
              "option"
            );

          option.value =
            item.sourceRow;

          option.textContent =
            item.nama;

          option.dataset.nama =
            item.nama;

          option.dataset.nip =
            item.nip;

          select.appendChild(
            option
          );

        }
      );

      if (
        current &&
        Array.prototype.some.call(
          select.options,
          function(option) {
            return option.value === current;
          }
        )
      ) {
        select.value = current;
      }

      psppemDosenChanged(
        number
      );

    }
  );

}


function psppemLoadDosen(force) {

  if (
    psppemDosenState.loaded &&
    !force
  ) {
    psppemBuildDosenSelects();

    return Promise.resolve(
      psppemDosenState.data
    );
  }

  if (
    psppemDosenState.loading &&
    psppemDosenState.loadingPromise
  ) {
    return psppemDosenState.loadingPromise;
  }

  psppemDosenState.loading = true;

  psppemDosenState.loadingPromise =
    psppemJsonp(
      PSPPEM_WEB_APP_URL +
      "?action=getDosen"
    )
      .then(
        function(response) {

          if (
            !response ||
            response.result !== "success"
          ) {
            throw new Error(
              response && response.message
                ? response.message
                : "Daftar dosen gagal diambil."
            );
          }

          if (
            !Array.isArray(
              response.data
            )
          ) {
            throw new Error(
              "Format daftar dosen tidak valid."
            );
          }

          psppemDosenState.data =
            response.data
              .map(
                function(item) {
                  return {
                    sourceRow:
                      psppemNormalize(
                        item.sourceRow
                      ),
                    nama:
                      psppemNormalize(
                        item.nama
                      ),
                    nip:
                      psppemNormalize(
                        item.nip
                      )
                  };
                }
              )
              .filter(
                function(item) {
                  return item.nama;
                }
              );

          psppemDosenState.loaded = true;

          psppemBuildDosenSelects();

          return psppemDosenState.data;

        }
      )
      .finally(
        function() {
          psppemDosenState.loading = false;
          psppemDosenState.loadingPromise = null;
        }
      );

  return psppemDosenState.loadingPromise;

}


function psppemGetSelectedDosen(number) {

  var select =
    document.getElementById(
      "psppemAddPembimbing" + number
    );

  if (
    !select ||
    !select.value ||
    select.selectedIndex < 0
  ) {
    return {
      sourceRow: "",
      nama: "",
      nip: ""
    };
  }

  var option =
    select.options[
      select.selectedIndex
    ];

  return {
    sourceRow:
      psppemNormalize(
        select.value
      ),
    nama:
      psppemNormalize(
        option.dataset.nama ||
        option.textContent
      ),
    nip:
      psppemNormalize(
        option.dataset.nip
      )
  };

}


function psppemDosenChanged(number) {

  var selected =
    psppemGetSelectedDosen(
      number
    );

  var nipInput =
    document.getElementById(
      "psppemAddNip" + number
    );

  if (nipInput) {
    nipInput.value =
      selected.nip;
  }

}


/* =========================================================
   LOAD DATA
   ========================================================= */

function psppemLoadData(force) {


  if (
    psppemState.loaded &&
    !force
  ) {

    return Promise.resolve(
      psppemState.data
    );

  }


  if (
    psppemState.loading &&
    psppemState.loadingPromise
  ) {

    return psppemState.loadingPromise;

  }


  psppemState.loading =
    true;


  psppemState.loadingPromise =
    psppemJsonp(
      PSPPEM_WEB_APP_URL
    )
      .then(
        function(response) {


          if (
            !response ||
            response.result !==
            "success"
          ) {

            throw new Error(
              response &&
              response.message
                ? response.message
                : "Data gagal diambil."
            );

          }


          if (
            !Array.isArray(
              response.data
            )
          ) {

            throw new Error(
              "Format data server tidak valid."
            );

          }


          psppemState.data =
            response.data
              .map(
                function(item) {

                  return {

                    sourceRow:
                      item.sourceRow || "",

                    nama:
                      psppemNormalize(
                        item.nama
                      ),

                    nim:
                      psppemNormalize(
                        item.nim
                      ),

                    angkatan:
                      psppemNormalize(
                        item.angkatan
                      ),

                    pembimbing1:
                      psppemNormalize(
                        item.pembimbing1
                      ),

                    nip1:
                      psppemNormalize(
                        item.nip1
                      ),

                    pembimbing2:
                      psppemNormalize(
                        item.pembimbing2
                      ),

                    nip2:
                      psppemNormalize(
                        item.nip2
                      )

                  };

                }
              )
              .filter(
                function(item) {

                  return (
                    item.nama ||
                    item.nim
                  );

                }
              );


          psppemState.data.sort(
            function(a, b) {


              var angkatanCompare =
                b.angkatan.localeCompare(
                  a.angkatan,
                  "id-ID",
                  {
                    numeric: true,
                    sensitivity: "base"
                  }
                );


              if (
                angkatanCompare !==
                0
              ) {

                return angkatanCompare;

              }


              return a.nama.localeCompare(
                b.nama,
                "id-ID",
                {
                  sensitivity:
                    "base"
                }
              );

            }
          );


          psppemBuildAngkatan();


          psppemState.loaded =
            true;


          return psppemState.data;

        }
      )
      .finally(
        function() {

          psppemState.loading =
            false;

          psppemState.loadingPromise =
            null;

        }
      );


  return psppemState.loadingPromise;

}



/* =========================================================
   BUILD ANGKATAN
   ========================================================= */

function psppemBuildAngkatan() {

  var select =
    document.getElementById(
      "psppemAngkatan"
    );


  if (!select) {
    return;
  }


  var current =
    select.value;


  var list =
    [];


  psppemState.data.forEach(
    function(item) {


      if (
        item.angkatan &&
        list.indexOf(
          item.angkatan
        ) === -1
      ) {

        list.push(
          item.angkatan
        );

      }

    }
  );


  list.sort(
    function(a, b) {

      return b.localeCompare(
        a,
        "id-ID",
        {
          numeric: true
        }
      );

    }
  );


  select.innerHTML =
    '<option value="">Semua Angkatan</option>';


  list.forEach(
    function(value) {


      var option =
        document.createElement(
          "option"
        );


      option.value =
        value;


      option.textContent =
        value;


      select.appendChild(
        option
      );

    }
  );


  if (
    list.indexOf(
      current
    ) !== -1
  ) {

    select.value =
      current;

  }

}



/* =========================================================
   CARD
   ========================================================= */

function psppemAdvisor(
  number,
  name,
  nip
) {


  var nameHtml =
    name
      ? psppemEscape(name)
      : '<span class="psppem-empty-value">Belum ditentukan</span>';


  var nipHtml =
    nip
      ? "<strong>NIP</strong> " +
        psppemEscape(nip)
      : '<span class="psppem-empty-value">NIP belum tersedia</span>';


  return `
    <div class="psppem-advisor">

      <span class="psppem-advisor-label">
        Pembimbing ${number}
      </span>

      <div class="psppem-advisor-name">
        ${nameHtml}
      </div>

      <div class="psppem-advisor-nip">
        ${nipHtml}
      </div>

    </div>
  `;

}



function psppemStudentCard(item) {

  var angkatanHtml =
    item.angkatan
      ? `
        <span class="psppem-angkatan-badge">
          Angkatan ${psppemEscape(item.angkatan)}
        </span>
      `
      : "";


  return `
    <article class="psppem-student-card">

      <div class="psppem-student-head">

        <div>

          <h3 class="psppem-student-name">
            ${psppemEscape(item.nama || "-")}
          </h3>

          <div class="psppem-student-meta">

            <strong>NIM</strong>

            ${psppemEscape(item.nim || "-")}

          </div>

        </div>

        ${angkatanHtml}

      </div>


      <div class="psppem-advisor-grid">

        ${psppemAdvisor(
          "I",
          item.pembimbing1,
          item.nip1
        )}

        ${psppemAdvisor(
          "II",
          item.pembimbing2,
          item.nip2
        )}

      </div>

    </article>
  `;

}



/* =========================================================
   RENDER
   ========================================================= */

function psppemRender(data) {

  var total =
    document.getElementById(
      "psppemTotal"
    );


  var container =
    document.getElementById(
      "psppemData"
    );


  if (
    !total ||
    !container
  ) {

    return;

  }


  total.textContent =
    data.length;


  if (
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="psppem-empty">

        <h3>
          Data tidak ditemukan
        </h3>

        <p>
          Tidak ada mahasiswa yang sesuai
          dengan pencarian atau filter angkatan.
        </p>

      </div>
    `;

    return;

  }


  container.innerHTML =
    '<div class="psppem-student-list">' +
    data.map(
      psppemStudentCard
    ).join("") +
    "</div>";

}



/* =========================================================
   SHOW DATA
   ========================================================= */

function psppemShowData() {

  var button =
    document.getElementById(
      "psppemShowButton"
    );


  var label =
    document.getElementById(
      "psppemShowLabel"
    );


  psppemClearStatus();


  if (button) {

    button.classList.add(
      "is-loading"
    );

  }


  if (label) {

    label.textContent =
      "Memuat...";

  }


  psppemLoadData(false)
    .then(
      function() {


        var searchInput =
          document.getElementById(
            "psppemSearch"
          );


        var select =
          document.getElementById(
            "psppemAngkatan"
          );


        var keywordOriginal =
          psppemNormalize(
            searchInput
              ? searchInput.value
              : ""
          );


        var keyword =
          keywordOriginal.toLowerCase();


        var angkatan =
          psppemNormalize(
            select
              ? select.value
              : ""
          );


        var filtered =
          psppemState.data.filter(
            function(item) {


              var matchAngkatan =
                !angkatan ||
                item.angkatan ===
                angkatan;


              var searchable = [

                item.nama,
                item.nim,
                item.angkatan,

                item.pembimbing1,
                item.nip1,

                item.pembimbing2,
                item.nip2

              ]
                .join(" ")
                .toLowerCase();


              var matchSearch =
                !keyword ||
                searchable.indexOf(
                  keyword
                ) !== -1;


              return (
                matchAngkatan &&
                matchSearch
              );

            }
          );


        var info =
          [];


        if (angkatan) {

          info.push(
            "Angkatan " +
            angkatan
          );

        }


        if (keywordOriginal) {

          info.push(
            'Pencarian "' +
            keywordOriginal +
            '"'
          );

        }


        var infoElement =
          document.getElementById(
            "psppemResultInfo"
          );


        if (infoElement) {

          infoElement.textContent =
            info.length
              ? info.join(" • ")
              : "Menampilkan seluruh data mahasiswa.";

        }


        var result =
          document.getElementById(
            "psppemResultArea"
          );


        if (result) {

          result.style.display =
            "block";

        }


        psppemRender(
          filtered
        );

      }
    )
    .catch(
      function(error) {


        psppemState.loaded =
          false;


        psppemStatus(
          "error",
          "Gagal memuat data. " +
          (
            error &&
            error.message
              ? error.message
              : "Silakan coba kembali."
          )
        );

      }
    )
    .finally(
      function() {


        if (button) {

          button.classList.remove(
            "is-loading"
          );

        }


        if (label) {

          label.textContent =
            "Tampilkan Data";

        }

      }
    );

}



/* =========================================================
   RESET DISPLAY
   ========================================================= */

function psppemResetDisplay() {

  var search =
    document.getElementById(
      "psppemSearch"
    );


  var clear =
    document.getElementById(
      "psppemSearchClear"
    );


  var select =
    document.getElementById(
      "psppemAngkatan"
    );


  var result =
    document.getElementById(
      "psppemResultArea"
    );


  var data =
    document.getElementById(
      "psppemData"
    );


  var total =
    document.getElementById(
      "psppemTotal"
    );


  if (search) {

    search.value = "";

  }


  if (clear) {

    clear.classList.remove(
      "is-visible"
    );

  }


  if (select) {

    select.value = "";

  }


  if (result) {

    result.style.display =
      "none";

  }


  if (data) {

    data.innerHTML =
      "";

  }


  if (total) {

    total.textContent =
      "0";

  }


  psppemClearStatus();


  if (search) {

    search.focus();

  }

}



/* =========================================================
   MODAL
   ========================================================= */

function psppemHideModalMessage() {

  var message =
    document.getElementById(
      "psppemAddMessage"
    );


  if (!message) {
    return;
  }


  message.style.display =
    "none";


  message.textContent =
    "";


  message.className =
    "psppem-modal-message";

}



function psppemModalMessage(
  type,
  text
) {

  var message =
    document.getElementById(
      "psppemAddMessage"
    );


  if (!message) {
    return;
  }


  message.className =
    "psppem-modal-message is-" +
    type;


  message.textContent =
    text;


  message.style.display =
    "block";

}



function psppemOpenAddModal() {

  var modal =
    document.getElementById(
      "psppemAddModal"
    );


  var form =
    document.getElementById(
      "psppemAddForm"
    );


  if (!modal) {

    alert(
      "Modal Tambah Mahasiswa tidak ditemukan."
    );

    return;

  }


  if (form) {

    form.reset();

  }


  psppemHideModalMessage();


  psppemSetDosenSelectStatus(
    "Memuat daftar dosen...",
    true
  );


  psppemLoadDosen(false)
    .catch(
      function(error) {

        psppemSetDosenSelectStatus(
          "Daftar dosen gagal dimuat",
          true
        );

        psppemModalMessage(
          "error",
          error && error.message
            ? error.message
            : "Daftar dosen gagal dimuat."
        );

      }
    );


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


  document.body.classList.add(
    "psppem-modal-open"
  );


  setTimeout(
    function() {


      var nama =
        document.getElementById(
          "psppemAddNama"
        );


      if (nama) {

        nama.focus();

      }

    },
    50
  );

}



function psppemCloseAddModal() {

  var modal =
    document.getElementById(
      "psppemAddModal"
    );


  if (!modal) {
    return;
  }


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


  document.body.classList.remove(
    "psppem-modal-open"
  );

}



function psppemBackdropClose(event) {

  var modal =
    document.getElementById(
      "psppemAddModal"
    );


  if (
    event.target ===
    modal
  ) {

    psppemCloseAddModal();

  }

}



/* =========================================================
   POST VIA HIDDEN IFRAME
   ========================================================= */

function psppemRequestId() {

  return (
    "psppem_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );

}



function psppemCleanupPost(requestId) {

  var pending =
    psppemPostRequests[
      requestId
    ];


  if (!pending) {
    return;
  }


  if (pending.timeoutId) {

    clearTimeout(
      pending.timeoutId
    );

  }


  if (
    pending.form &&
    pending.form.parentNode
  ) {

    pending.form.parentNode.removeChild(
      pending.form
    );

  }


  if (
    pending.iframe &&
    pending.iframe.parentNode
  ) {

    pending.iframe.parentNode.removeChild(
      pending.iframe
    );

  }


  delete psppemPostRequests[
    requestId
  ];

}



function psppemPostForm(payload) {

  return new Promise(
    function(resolve, reject) {


      var requestId =
        psppemRequestId();


      var iframeName =
        "psppemPostFrame_" +
        requestId.replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        );


      var iframe =
        document.createElement(
          "iframe"
        );


      iframe.name =
        iframeName;


      iframe.id =
        iframeName;


      iframe.style.display =
        "none";


      iframe.setAttribute(
        "aria-hidden",
        "true"
      );


      var form =
        document.createElement(
          "form"
        );


      form.method =
        "POST";


      form.action =
        PSPPEM_WEB_APP_URL;


      form.target =
        iframeName;


      form.style.display =
        "none";


      form.setAttribute(
        "accept-charset",
        "UTF-8"
      );


      var postPayload = {};


      Object.keys(
        payload || {}
      ).forEach(
        function(key) {

          postPayload[key] =
            payload[key];

        }
      );


      postPayload.requestId =
        requestId;


      Object.keys(
        postPayload
      ).forEach(
        function(key) {


          var input =
            document.createElement(
              "input"
            );


          input.type =
            "hidden";


          input.name =
            key;


          input.value =
            postPayload[key] == null
              ? ""
              : String(
                  postPayload[key]
                );


          form.appendChild(
            input
          );

        }
      );


      var timeoutId =
        setTimeout(
          function() {


            var pending =
              psppemPostRequests[
                requestId
              ];


            if (!pending) {
              return;
            }


            var rejectRequest =
              pending.reject;


            psppemCleanupPost(
              requestId
            );


            rejectRequest(
              new Error(
                "Server tidak merespons proses penyimpanan dalam 20 detik."
              )
            );


          },
          20000
        );


      psppemPostRequests[
        requestId
      ] = {

        resolve:
          resolve,

        reject:
          reject,

        iframe:
          iframe,

        form:
          form,

        timeoutId:
          timeoutId

      };


      document.body.appendChild(
        iframe
      );


      document.body.appendChild(
        form
      );


      try {

        form.submit();

      } catch (error) {


        psppemCleanupPost(
          requestId
        );


        reject(
          error instanceof Error
            ? error
            : new Error(
                "Form gagal dikirim ke Apps Script."
              )
        );

      }


    }
  );

}



window.addEventListener(
  "message",
  function(event) {


    var data =
      event.data;


    if (
      !data ||
      typeof data !==
        "object" ||
      data.channel !==
        "psppem" ||
      !data.requestId
    ) {

      return;

    }


    var requestId =
      String(
        data.requestId
      );


    var pending =
      psppemPostRequests[
        requestId
      ];


    if (!pending) {
      return;
    }


    var resolveRequest =
      pending.resolve;


    psppemCleanupPost(
      requestId
    );


    resolveRequest(
      data
    );


  }
);



/* =========================================================
   SUBMIT STUDENT
   ========================================================= */

function psppemSubmitStudent(event) {

  event.preventDefault();


  var form =
    document.getElementById(
      "psppemAddForm"
    );


  var submit =
    document.getElementById(
      "psppemAddSubmit"
    );


  if (
    !form ||
    !form.checkValidity()
  ) {

    if (form) {

      form.reportValidity();

    }

    return;

  }


  psppemHideModalMessage();


  var dosen1 =
    psppemGetSelectedDosen(1);


  var dosen2 =
    psppemGetSelectedDosen(2);


  var payload = {

    action:
      "addStudent",

    password:
      document.getElementById(
        "psppemAddPassword"
      ).value,

    nama:
      psppemNormalize(
        document.getElementById(
          "psppemAddNama"
        ).value
      ),

    nim:
      psppemNormalize(
        document.getElementById(
          "psppemAddNim"
        ).value
      ),

    angkatan:
      psppemNormalize(
        document.getElementById(
          "psppemAddAngkatan"
        ).value
      ),

    pembimbing1Row:
      dosen1.sourceRow,

    pembimbing1:
      dosen1.nama,

    nip1:
      dosen1.nip,

    pembimbing2Row:
      dosen2.sourceRow,

    pembimbing2:
      dosen2.nama,

    nip2:
      dosen2.nip

  };


  if (submit) {

    submit.disabled =
      true;


    submit.textContent =
      "Menyimpan...";

  }


  psppemPostForm(
    payload
  )
    .then(
      function(result) {


        if (
          result.result ===
          "unauthorized"
        ) {

          throw new Error(
            result.message ||
            "Password admin salah."
          );

        }


        if (
          result.result ===
          "duplicate"
        ) {

          throw new Error(
            result.message ||
            "NIM sudah terdaftar."
          );

        }


        if (
          result.result !==
          "success"
        ) {

          throw new Error(
            result.message ||
            "Data gagal disimpan."
          );

        }


        psppemModalMessage(
          "success",
          "Data mahasiswa berhasil disimpan."
        );


        psppemState.loaded =
          false;


        return psppemLoadData(
          true
        )
          .then(
            function() {


              var nimBaru =
                payload.nim;


              setTimeout(
                function() {


                  psppemCloseAddModal();


                  var search =
                    document.getElementById(
                      "psppemSearch"
                    );


                  var select =
                    document.getElementById(
                      "psppemAngkatan"
                    );


                  if (search) {

                    search.value =
                      nimBaru;

                  }


                  if (select) {

                    select.value =
                      "";

                  }


                  psppemSearchChanged();


                  psppemShowData();


                  psppemStatus(
                    "success",
                    "Data mahasiswa berhasil ditambahkan ke Google Sheet."
                  );


                },
                600
              );


            }
          );

      }
    )
    .catch(
      function(error) {


        psppemModalMessage(
          "error",
          error &&
          error.message
            ? error.message
            : "Data mahasiswa gagal disimpan."
        );

      }
    )
    .finally(
      function() {


        if (submit) {

          submit.disabled =
            false;


          submit.textContent =
            "Simpan Mahasiswa";

        }

      }
    );

}



/* =========================================================
   ESC MODAL
   ========================================================= */

document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key ===
      "Escape"
    ) {

      var modal =
        document.getElementById(
          "psppemAddModal"
        );


      if (
        modal &&
        modal.classList.contains(
          "is-open"
        )
      ) {

        psppemCloseAddModal();

      }

    }

  }
);



/* =========================================================
   INITIALIZATION
   ========================================================= */

/*
  Tidak mengunci tombol.

  Hanya preload diam-diam supaya filter
  angkatan sudah tersedia lebih cepat.
*/

setTimeout(
  function() {


    psppemLoadData(false)
      .catch(
        function(error) {

          console.warn(
            "Preload data pembimbing gagal:",
            error
          );

        }
      );


    psppemLoadDosen(false)
      .catch(
        function(error) {

          console.warn(
            "Preload daftar dosen gagal:",
            error
          );

        }
      );


    console.log(
      "PSPPI Daftar Pembimbing siap."
    );

  },
  100
);
