async function renderPdfFromServer(filename) {
  const url = `/api/list-file/uploads/${filename}`;
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

// Load list files
async function loadFileList() {
  const res = await fetch('/api/list-file');
  const data = await res.json();
  if (data.success) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    data.files.forEach(name => {
      const btn = document.createElement('button');
      btn.textContent = name.replace('.pdf', '');
      btn.onclick = () => renderPdfFromServer(name);
      fileList.appendChild(btn);
    });
  }
}

loadFileList();
