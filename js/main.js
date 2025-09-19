pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const $fileList = $('#fileList');
const $flipbook = $('#flipbook');
const $bar = $('#bar');
const $overlay = $('#overlay');
const urlParams = new URLSearchParams(window.location.search);
const pdfFile = urlParams.get('book') || 'default.pdf';
let currentPdfUrl = `https://zsllvrkmsvvczmaevrws.supabase.co/storage/v1/object/public/Uploads/${pdfFile}`;
// const pdfUrl = urlParams.get('book') || 'source.pdf';
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let pdfDoc = null;
let pageCache = {}; // simpan halaman yang sudah dirender


async function loadFileList() {
  try {
    const res = await fetch('/api/list-file');
    const data = await res.json();
    $fileList.empty();
    if (data.success && data.files.length > 0) {
      data.files.forEach(f => {
        const displayName = f.replace(/\.pdf$/i, ''); // hilangkan .pdf
        const item = $(`<div class="file-item" data-fname="${f}">${displayName}</div>`);
        item.on('click', async () => {
          // visual active
          $fileList.find('.file-item').removeClass('active');
          item.addClass('active');

          // load file baru
          $overlay.show();
          pdfDoc = null;
          pageCache = {};
          currentPdfUrl = `https://zsllvrkmsvvczmaevrws.supabase.co/storage/v1/object/public/Uploads/${f}`;
          try {
            await loadPDF(); // hanya load dokumen

            if ($flipbook.data('turn')) {
                $flipbook.turn('destroy').empty();  // destroy flipbook lama
              }
              createEmptyPages(pdfDoc.numPages);  
            
            await init();    // init flipbook (destroy + create pages + render)
            // sync zoom scale (jika slider sudah diubah sebelumnya)
            applyZoom();
          } catch (err) {
            console.error('Gagal load file:', err);
            alert('Gagal load file: ' + (err.message || err));
          } finally {
            $overlay.hide();
          }
        });
        $fileList.append(item);
      });

      // set active ke file yang sedang terbuka (jika ada)
      const cur = currentPdfUrl.split('/').pop();
      $fileList.find(`.file-item[data-fname="${cur}"]`).addClass('active');
    } else {
      $fileList.html('<div style="padding:8px;color:#666">Tidak ada file</div>');
    }
  } catch (err) {
    console.error(err);
    $fileList.html('<div style="padding:8px;color:#c00">Error load file list</div>');
  }
}

async function loadPDF() {
   pdfDoc = await pdfjsLib.getDocument(currentPdfUrl).promise;
}



function createEmptyPages(numPages) {
  $flipbook.html('');
  for (let i = 1; i <= numPages; i++) {
    const div = document.createElement('div');
    div.className = 'page';
    div.dataset.page = i;
    // isi skeleton
    div.innerHTML = '<div class="skeleton"></div>';
    $flipbook.append(div);
  }
}

async function renderPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return;
  if (pageCache[pageNumber]) return;

  const page = await pdfDoc.getPage(pageNumber);

  // skala normal
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    ($flipbook.width() - 2) / viewport.width,
    ($flipbook.height() - 2) / viewport.height
  );

  // faktor retina
  const devicePixelRatio = window.devicePixelRatio || 1;
  const renderScale = scale * devicePixelRatio;
  const v2 = page.getViewport({ scale: renderScale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = v2.width;
  canvas.height = v2.height;
  canvas.style.width = (v2.width / devicePixelRatio) + 'px';
  canvas.style.height = (v2.height / devicePixelRatio) + 'px';

  // render PDF ke canvas
  await page.render({ canvasContext: ctx, viewport: v2 }).promise;

  // ganti skeleton di halaman flipbook dengan canvas
  const div = $flipbook.find(`.page[data-page="${pageNumber}"]`)[0];
  if (!div) return;
  div.innerHTML = '';       // hapus skeleton
  div.appendChild(canvas);  // masukkan canvas hasil render

  pageCache[pageNumber] = true;
}



async function init() {
var w = window.innerWidth * 0.95;  // 95% lebar layar
var h = window.innerHeight * 0.9;  // 90% tinggi layar

  $('#overlay').show();
  $bar.css('width', '0');

  if (!pdfDoc) {
    await loadPDF();
  }

  // destroy flipbook lama
  if ($flipbook.data('turn')) {
    $flipbook.turn('destroy').empty();
  }

  // buat kontainer kosong halaman baru
  createEmptyPages(pdfDoc.numPages);

  $flipbook.turn({
    pages: pdfDoc.numPages, // penting!
    width: w,
    height: h,
    autoCenter: true,
    acceleration: true,
    gradients: !$.isTouch,
    elevation: 50,
    display: w < 768 ? 'single' : 'double',
    when: {
     turning: function (event, page) {
      if (!pdfDoc) return;
      [page - 1, page, page + 1].forEach(p => {
        if (p >= 1 && p <= pdfDoc.numPages) renderPage(p);
      });
    },
    turned: function (event, page) {
      if (!pdfDoc) return;
      const progress = (page / pdfDoc.numPages) * 100;
      $bar.css('width', progress + '%');
    }
  }
  });

  renderPage(1);
  if (pdfDoc.numPages > 1) renderPage(2);

  $('#overlay').hide();
}

// gesture swipe
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);
let xDown = null,
  yDown = null;
function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
  yDown = evt.touches[0].clientY;
}
function handleTouchMove(evt) {
  if (!xDown || !yDown) return;
  var xUp = evt.touches[0].clientX;
  var yUp = evt.touches[0].clientY;
  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff > 0) {
      $flipbook.turn('next');
    } else {
      $flipbook.turn('previous');
    }
  }
  xDown = null;
  yDown = null;
}

document.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowRight') $flipbook.turn('next');
  if(e.key==='ArrowLeft') $flipbook.turn('previous');
});

// drag dengan mouse
let mouseX = null;
document.addEventListener('mousedown', (e)=>{ mouseX=e.clientX; });
document.addEventListener('mouseup', (e)=>{
  if(mouseX==null) return;
  let diff = mouseX - e.clientX;
  if(Math.abs(diff)>50){
    if(diff>0) $flipbook.turn('next'); else $flipbook.turn('previous');
  }
  mouseX=null;
});

function resizeFlipbook() {
  var w = window.innerWidth * 0.95;
  var h = window.innerHeight * 0.9;

  if ($('#flipbook').data('turn')) {
    $('#flipbook').turn('size', w, h);
  } else {
    $('#flipbook').turn({
      width: w,
      height: h,
      autoCenter: true,
      display: (w < 768) ? 'single' : 'double'
    });
  }
}

let zoomScale = 1;

function applyZoom(){
  // gunakan ukuran dasar (95% x 90% jendela)
  const baseW = Math.max(300, Math.round(window.innerWidth * 0.95));
  const baseH = Math.max(200, Math.round(window.innerHeight * 0.9));
  const newW = Math.round(baseW * zoomScale);
  const newH = Math.round(baseH * zoomScale);

  if ($flipbook.data('turn')) {
    const current = $flipbook.turn('page') || 1;
    // ubah ukuran flipbook
    $flipbook.turn('size', newW, newH);
    // set page kembali & center
    $flipbook.turn('page', current);
    try { $flipbook.turn('center'); } catch(e){/* ignore */ }

    // re-render visible pages (agar menghasilkan canvas dengan resolusi sesuai ukuran baru)
    [current - 1, current, current + 1].forEach(p => {
      if (p >= 1 && pdfDoc && p <= pdfDoc.numPages) {
        // clear cache supaya renderPage akan merender ulang pada skala baru
        pageCache[p] = false;
        const div = $flipbook.find(`.page[data-page="${p}"]`)[0];
        if (div) div.innerHTML = '<div class="placeholder">Loading</div>';
        // render ulang (tidak perlu await)
        renderPage(p);
      }
    });
  }
}

// slider binding (pastikan elemen ada di DOM)
const $zoomSlider = $('#zoomSlider');
const $zoomLabel = $('#zoomLabel');
if ($zoomSlider.length) {
  $zoomSlider.on('input', function(){
    zoomScale = parseFloat(this.value) || 1;
    $zoomLabel.text(Math.round(zoomScale * 100) + '%');
    applyZoom();
  });
}

// Jika sebelumnya ada tombol zoomIn/zoomOut, kamu bisa sync juga
$('#zoomIn').on?.('click', ()=>{
  zoomScale = Math.min(zoomScale + 0.1, 2);
  $zoomSlider.val(zoomScale);
  $zoomLabel.text(Math.round(zoomScale*100)+'%');
  applyZoom();
});
$('#zoomOut').on?.('click', ()=>{
  zoomScale = Math.max(zoomScale - 0.1, 0.6);
  $zoomSlider.val(zoomScale);
  $zoomLabel.text(Math.round(zoomScale*100)+'%');
  applyZoom();
});


init();
$flipbook.turn('page', 1);
loadFileList();


window.addEventListener('resize', () => {
  $('#flipbook').turn('display', window.innerWidth < 768 ? 'single' : 'double');
});


