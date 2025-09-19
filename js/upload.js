
 // pdf.js config
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    let pdfDoc = null;
    let pageCanvases = []; // list of canvas elements (or nodes) for pages
    let flipInitialized = false;

    const $flipbook = $('#flipbook');
    const $overlay = $('#overlay');
    const $overlayText = $('#overlayText');
    const $statusText = $('#statusText');
    const $progressBar = $('#progressBar');
    const $toc = $('#toc');

    function showOverlay(text = 'Loading...') {
      $overlayText.text(text);
      $overlay.addClass('show');
    }
    function hideOverlay() {
      $overlay.removeClass('show');
      updateProgress(0);
    }
    function updateProgress(pct) {
      $progressBar.css('width', pct + '%');
      $statusText.text(pct ? `Rendering ${pct}%` : 'Idle');
    }

    async function renderPdfFile(file) {
      // reset
      pdfDoc = null;
      pageCanvases = [];
      $toc.empty();
      $flipbook.empty();
      flipInitialized = false;

      showOverlay('Reading PDF...');
      const arrayBuffer = await file.arrayBuffer();
      showOverlay('Parsing PDF...');
      pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const total = pdfDoc.numPages;
      showOverlay(`Rendering ${total} page(s)...`);
      for (let p = 1; p <= total; ++p) {
        updateProgress(Math.round((p-1)/total*100));
        const page = await pdfDoc.getPage(p);

        // set scale so page fits our flip container size:
        // compute desired width/height in px based on flipbook size
        const flipW = $('#flipbook-wrap').width();
        const flipH = $('#flipbook-wrap').height();
        // maintain aspect ratio of PDF page
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min((flipW-2) / viewport.width, (flipH-2) / viewport.height);
        const scaledViewport = page.getViewport({ scale });

        // create canvas
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        // wrap canvas into .page for turn.js
        const pageNode = document.createElement('div');
        pageNode.className = 'page';
        // set explicit size to match flipbook container to avoid layout flicker
        pageNode.style.width = (flipW) + 'px';
        pageNode.style.height = (flipH) + 'px';
        // center the rendered canvas inside page
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        wrapper.appendChild(canvas);
        pageNode.appendChild(wrapper);

        pageCanvases.push(pageNode);

        // create thumbnail for TOC (small image)
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        const thumbImg = new Image();
        // create small image from canvas
        thumbImg.src = canvas.toDataURL('image/jpeg', 0.7);
        thumbImg.alt = `Page ${p}`;
        thumb.appendChild(thumbImg);
        thumb.addEventListener('click', () => {
          // turn to page index (turn.js pages are 1-based by sheet, but we built single pages)
          // In this demo, pages correspond 1:1 -> page number
          if ($flipbook.turn('page')) {
            $flipbook.turn('page', p);
          }
        });
        $toc.append(thumb);
      }

      updateProgress(100);
      showOverlay('Initializing flipbook...');
      await initFlipbookWithPages(pageCanvases);
      hideOverlay();
    }

    async function initFlipbookWithPages(nodes) {

     try {
      if (flipInitialized) {
        $flipbook.turn('destroy').off(); // destroy & off semua event jQuery
      }
    } catch(e) { console.warn(e); 

    }
      // clear flipbook content and add nodes
      $flipbook.html(''); // remove old
      for (const n of nodes) {
        $flipbook.append(n);
      }

      $flipbook.turn({
        width: $flipbook.width(),
        height: $flipbook.height(),
        autoCenter: true,
        display: 'single' // single pages; change to double if you want spreads
      });

      flipInitialized = true;
    }

    // Insert video as a page at chosen position
    async function insertVideoPage(file) {
      if (!file) return alert('Pilih file video dulu.');
      // create video element
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.controls = true;
      video.src = url;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';

      const flipW = $('#flipbook-wrap').width();
      const flipH = $('#flipbook-wrap').height();

      const pageNode = document.createElement('div');
      pageNode.className = 'page';
      pageNode.style.width = flipW + 'px';
      pageNode.style.height = flipH + 'px';

      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.appendChild(video);
      pageNode.appendChild(wrapper);

      // ask user position (simple prompt)
      let pos = prompt('Masukkan nomor halaman sebelum insert (1 = di awal, atau kosong untuk akhir):');
      if (pos === null) return; // cancel
      pos = pos.trim();
      let insertIndex = pageCanvases.length; // default append
      if (pos !== '') {
        const n = parseInt(pos, 10);
        if (!isNaN(n) && n >= 1) insertIndex = Math.min(Math.max(0, n-1), pageCanvases.length);
      }

      // insert into arrays and rebuild flip
      pageCanvases.splice(insertIndex, 0, pageNode);

      // update TOC (insert thumbnail)
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.innerHTML = '<div style="padding:8px;text-align:center;font-size:12px;">Video</div>';
      thumb.addEventListener('click', () => $flipbook.turn('page', insertIndex+1));
      $toc.append(thumb);

      // re-init flipbook
      await initFlipbookWithPages(pageCanvases);
    }

    // Event handlers
    $('#pdfInput').on('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        await renderPdfFile(f);
        const formData = new FormData();
        formData.append('file', f);
  
                    try {
                        showOverlay('Mengunggah PDF...');
                        const res = await fetch('http://localhost:3000/upload', {
                        method: 'POST',
                        body: formData
                        });
                        const data = await res.json();
                        console.log('Uploaded to server:', data.filename);

                        // setelah upload selesai, baru render file lokal (masih dari browser)
                        hideOverlay();
                     
                        loadFileList();
                    } catch (err) {
                        hideOverlay();
                        console.error(err);
                        alert('Gagal mengunggah PDF: ' + err.message || err);
                    }

      } catch (err) {
        console.error(err);
        alert('Gagal memproses PDF: ' + err.message || err);
        hideOverlay();
      }
    });

    $('#insertVideoBtn').on('click', () => {
      const vidFile = $('#videoInput')[0].files && $('#videoInput')[0].files[0];
      if (!vidFile) {
        alert('Pilih file video di field "Tambahkan Video" dulu.');
        return;
      }
      insertVideoPage(vidFile);
    });

    $('#clearBtn').on('click', () => {
      pdfDoc = null;
      pageCanvases = [];
      $flipbook.turn('destroy');
      $flipbook.html('');
      $toc.empty();
      $statusText.text('Cleared');
      updateProgress(0);
    });

    $('#prevBtn').on('click', () => {
      if (flipInitialized) $flipbook.turn('previous');
    });
    $('#nextBtn').on('click', () => {
      if (flipInitialized) $flipbook.turn('next');
    });
    $('#gotoBtn').on('click', () => {
      const val = parseInt($('#gotoInput').val());
      if (!isNaN(val) && flipInitialized) {
        $flipbook.turn('page', Math.max(1, Math.min(pageCanvases.length, val)));
      }
    });

   

    const $toclist = $('#toclist');


    // ambil daftar file dari server
async function loadFileList() {
  try {
    const res = await fetch('http://localhost:3000/files');
    const data = await res.json();
    $toclist.empty();
    if (data.success && data.files.length > 0) {
      data.files.forEach(f => {
        const item = $(`
          <div class="toc-item">
            <span>${f}</span>
            <button class="btn btn-delete">Delete</button>
            <button class="btn btn-open">View</button>
          </div>
        `);
        item.find('.btn-delete').on('click', async () => {
          if (confirm(`Hapus file ${f}?`)) {
            try {
              const delRes = await fetch(`http://localhost:3000/files/${f}`, { method: 'DELETE' });
              const delData = await delRes.json();
              if (delData.success) {
                alert('File deleted');
                loadFileList(); // refresh list
              } else {
                alert('Gagal delete: ' + delData.msg);
              }
            } catch(err) { console.error(err); alert('Error delete file') }
          }
        });
       item.find('.btn-open').on('click', async () => {
       try {
          await renderPdfFromServer(f);  // ini yang benar
        } catch (err) {
          console.error(err);
          alert('Gagal load PDF: ' + err.message);
        }
      });
        $toclist.append(item);
      });
    } else {
      $toclist.append('<div>Tidak ada file</div>');
    }
  } catch(err) {
    console.error(err);
    $toclist.html('<div>Error load file list</div>');
  }
}

async function renderPdfFromServer(filename) {
  const url = `https://zsllvrkmsvvczmaevrws.supabase.co/storage/v1/object/public/Uploads/${filename}`;
  try {
    showOverlay('Loading PDF dari server...');
    const res = await fetch(url);
    const blob = await res.blob();
    await renderPdfFile(new File([blob], filename, { type: blob.type }));
    hideOverlay();
  } catch (err) {
    hideOverlay();
    console.error(err);
    alert('Gagal load PDF: ' + err.message);
  }
}


// load daftar file saat halaman dibuka
$(document).ready(() => {
  loadFileList();
});

$(window).on('resize', () => {
  if (!flipInitialized) return;
  const current = $flipbook.turn('page');
  $('#flipbook .page').css({ width: $('#flipbook-wrap').width(), height: $('#flipbook-wrap').height() });
  $flipbook.turn('size', $('#flipbook-wrap').width(), $('#flipbook-wrap').height());
  $flipbook.turn('page', current);
});
