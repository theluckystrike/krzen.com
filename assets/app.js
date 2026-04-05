/* Image Compressor - krzen.com */
(function() {
  'use strict';

  var files = [];
  var currentIdx = 0;
  var originalBlob = null;
  var compressedBlob = null;
  var originalImg = null;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function getMimeType(format) {
    var map = { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };
    return map[format] || 'image/jpeg';
  }

  function getQuality() {
    return parseInt(document.getElementById('quality-slider').value, 10) / 100;
  }

  function getFormat() {
    return document.getElementById('format-select').value;
  }

  function getResizeDims(origW, origH) {
    var widthInput = document.getElementById('resize-width');
    var heightInput = document.getElementById('resize-height');
    var w = parseInt(widthInput.value, 10);
    var h = parseInt(heightInput.value, 10);
    if (w && !h) {
      h = Math.round(origH * (w / origW));
    } else if (h && !w) {
      w = Math.round(origW * (h / origH));
    } else if (!w && !h) {
      w = origW;
      h = origH;
    }
    return { w: w, h: h };
  }

  function handleFiles(fileList) {
    files = [];
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      if (/^image\/(jpeg|png|webp)/.test(f.type)) {
        files.push(f);
      }
    }
    if (files.length === 0) return;

    if (files.length === 1) {
      loadSingleFile(files[0]);
    } else {
      loadBulkFiles(files);
    }
  }

  function loadSingleFile(file) {
    originalBlob = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        originalImg = img;
        showFileInfo(file, img.width, img.height);
        showControls();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showFileInfo(file, w, h) {
    var el = document.getElementById('file-info');
    el.classList.add('visible');
    el.querySelector('.info-grid').innerHTML =
      '<div class="info-item"><label>File Name</label><span>' + file.name + '</span></div>' +
      '<div class="info-item"><label>Dimensions</label><span>' + w + ' x ' + h + '</span></div>' +
      '<div class="info-item"><label>File Size</label><span>' + formatSize(file.size) + '</span></div>' +
      '<div class="info-item"><label>Format</label><span>' + file.type.split('/')[1].toUpperCase() + '</span></div>';
  }

  function showControls() {
    document.getElementById('compress-controls').classList.add('visible');
  }

  function compress() {
    if (!originalImg) return;
    var format = getFormat();
    var quality = getQuality();
    var dims = getResizeDims(originalImg.width, originalImg.height);

    var canvas = document.createElement('canvas');
    canvas.width = dims.w;
    canvas.height = dims.h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(originalImg, 0, 0, dims.w, dims.h);

    var mime = getMimeType(format);
    canvas.toBlob(function(blob) {
      if (!blob) return;
      compressedBlob = blob;
      showResults(originalBlob.size, blob.size);
      showComparison(canvas);
    }, mime, quality);
  }

  function showResults(origSize, compSize) {
    var savings = ((1 - compSize / origSize) * 100);
    var el = document.getElementById('results');
    el.classList.add('visible');
    el.querySelector('.results-grid').innerHTML =
      '<div class="result-item"><div class="value">' + formatSize(origSize) + '</div><div class="label">Original</div></div>' +
      '<div class="result-item"><div class="value">' + formatSize(compSize) + '</div><div class="label">Compressed</div></div>' +
      '<div class="result-item"><div class="value ' + (savings > 0 ? 'savings-positive' : '') + '">' + savings.toFixed(1) + '%</div><div class="label">Savings</div></div>';
  }

  function showComparison(compCanvas) {
    var container = document.getElementById('comparison');
    container.classList.add('visible');

    var wrapper = container.querySelector('.comp-container');
    wrapper.innerHTML = '';

    // Original canvas
    var origCanvas = document.createElement('canvas');
    origCanvas.width = compCanvas.width;
    origCanvas.height = compCanvas.height;
    var origCtx = origCanvas.getContext('2d');
    origCtx.drawImage(originalImg, 0, 0, compCanvas.width, compCanvas.height);

    // Display both
    var displayW = Math.min(container.clientWidth, compCanvas.width);
    var displayH = Math.round(displayW * (compCanvas.height / compCanvas.width));

    origCanvas.style.width = displayW + 'px';
    origCanvas.style.height = displayH + 'px';
    compCanvas.style.width = displayW + 'px';
    compCanvas.style.height = displayH + 'px';

    wrapper.style.height = displayH + 'px';
    wrapper.style.position = 'relative';

    origCanvas.style.position = 'absolute';
    origCanvas.style.top = '0';
    origCanvas.style.left = '0';

    compCanvas.style.position = 'absolute';
    compCanvas.style.top = '0';
    compCanvas.style.left = '0';
    compCanvas.style.clipPath = 'inset(0 50% 0 0)';

    var slider = document.createElement('div');
    slider.className = 'comp-slider';
    slider.style.left = '50%';

    var labelOrig = document.createElement('div');
    labelOrig.className = 'comp-label comp-label-right';
    labelOrig.textContent = 'Original';

    var labelComp = document.createElement('div');
    labelComp.className = 'comp-label comp-label-left';
    labelComp.textContent = 'Compressed';

    wrapper.appendChild(origCanvas);
    wrapper.appendChild(compCanvas);
    wrapper.appendChild(slider);
    wrapper.appendChild(labelOrig);
    wrapper.appendChild(labelComp);

    // Slider drag
    var dragging = false;
    slider.addEventListener('mousedown', function() { dragging = true; });
    slider.addEventListener('touchstart', function() { dragging = true; });
    document.addEventListener('mouseup', function() { dragging = false; });
    document.addEventListener('touchend', function() { dragging = false; });

    function moveSlider(clientX) {
      var rect = wrapper.getBoundingClientRect();
      var pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      slider.style.left = pct + '%';
      compCanvas.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
    }

    wrapper.addEventListener('mousemove', function(e) {
      if (dragging) moveSlider(e.clientX);
    });
    wrapper.addEventListener('touchmove', function(e) {
      if (dragging && e.touches[0]) moveSlider(e.touches[0].clientX);
    });
  }

  function downloadCompressed() {
    if (!compressedBlob) return;
    var format = getFormat();
    var ext = format === 'jpeg' ? 'jpg' : format;
    var name = (originalBlob.name || 'image').replace(/\.[^.]+$/, '') + '-compressed.' + ext;
    var url = URL.createObjectURL(compressedBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadBulkFiles(fileList) {
    var list = document.getElementById('bulk-list');
    list.classList.add('visible');
    list.innerHTML = '<h3 style="font-family:var(--font-display);font-size:0.85rem;color:var(--accent);text-transform:uppercase;margin-bottom:12px;">' + fileList.length + ' Images Selected</h3>';

    showControls();

    for (var i = 0; i < fileList.length; i++) {
      var item = document.createElement('div');
      item.className = 'bulk-item';
      item.innerHTML = '<span class="name">' + fileList[i].name + '</span><span class="size">' + formatSize(fileList[i].size) + '</span><button class="btn" data-idx="' + i + '" style="padding:6px 14px;font-size:0.8rem;">Compress</button>';
      list.appendChild(item);
    }

    list.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      compressBulkItem(fileList[idx], btn);
    });
  }

  function compressBulkItem(file, btn) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var format = getFormat();
        var quality = getQuality();
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        canvas.toBlob(function(blob) {
          if (!blob) return;
          var ext = format === 'jpeg' ? 'jpg' : format;
          var name = file.name.replace(/\.[^.]+$/, '') + '-compressed.' + ext;
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
          btn.textContent = 'Done';
          btn.disabled = true;
          btn.style.opacity = '0.5';
        }, getMimeType(format), quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Init
  window.krzen = {
    compress: compress,
    download: downloadCompressed
  };

  document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', function() { fileInput.click(); });

    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', function() {
      handleFiles(fileInput.files);
    });

    var slider = document.getElementById('quality-slider');
    var display = document.getElementById('quality-value');
    slider.addEventListener('input', function() {
      display.textContent = slider.value;
    });
  });
})();
