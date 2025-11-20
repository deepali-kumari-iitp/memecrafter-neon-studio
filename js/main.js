/* script.js
   Clean, modular, commented.
   Features: upload bg, add text, add stickers/emojis,
   drag, resize, rotate, layer controls, download PNG.
*/

(function () {
  // --- helper data (stickers/emojis) ---
  const stickerSvgs = {
    explosion: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path fill='#ffb020' d='M32 4l4 12 10-6-6 10 12 4-12 4 6 10-10-6-4 12-4-12-10 6 6-10-12-4 12-4-6-10 10 6z'/></svg>`,
    star: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#ffd166' d='M12 .587l3.668 7.431L23.6 9.75l-5.8 5.65L19.335 24 12 19.897 4.665 24l1.535-8.6L.4 9.75l7.932-1.732z'/></svg>`,
    heart: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#ff7ab6' d='M12 21s-7-4.733-9-8.2C-1.4 7.7 5.6 2 9 6c1.9 2.5 3 3.6 3 3.6s1.1-1.1 3-3.6c3.4-4 10.4 1.7 6 6.8-2 3.5-9 8.2-9 8.2z'/></svg>`
  };

  const svgToData = (s) => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);

  const stickersList = [
    { type: 'emoji', label: '😂', value: '😂' },
    { type: 'emoji', label: '😎', value: '😎' },
    { type: 'emoji', label: '🤣', value: '🤣' },
    { type: 'emoji', label: '😭', value: '😭' },
    { type: 'sticker', label: '💥', value: svgToData(stickerSvgs.explosion) },
    { type: 'sticker', label: '✨', value: svgToData(stickerSvgs.star) },
    { type: 'sticker', label: '💖', value: svgToData(stickerSvgs.heart) }
  ];

  // --- DOM references ---
  const refs = {
    stage: document.getElementById('stage'),
    stageInner: document.getElementById('stage-inner'),
    bgImg: document.getElementById('bg-img'),
    fileInput: document.getElementById('file'),
    stickersEl: document.getElementById('stickers'),
    addTextInput: document.getElementById('add-text'),
    addTextBtn: document.getElementById('add-text-btn'),
    sizeBtns: document.querySelectorAll('.size-btn'),
    bringForward: document.getElementById('bring-forward'),
    sendBack: document.getElementById('send-back'),
    downloadBtn: document.getElementById('download'),
    resetBtn: document.getElementById('reset')
  };

  // --- state ---
  let selected = null;

  // --- initialize stickers toolbar ---
  function initStickers() {
    stickersList.forEach(s => {
      const b = document.createElement('button');
      b.className = 'sticker-btn';
      b.title = s.label;

      b.innerHTML =
        s.type === 'emoji'
          ? `<span style="font-size:20px">${s.label}</span>`
          : `<img src="${s.value}" style="width:28px;height:28px" alt="s"/>`;

      b.addEventListener('click', () => addSticker(s));
      refs.stickersEl.appendChild(b);
    });
  }

  // --- file upload ---
  refs.fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    refs.bgImg.src = URL.createObjectURL(f);
    refs.bgImg.style.objectFit = "contain"; // <-- Prevent cropping
    refs.bgImg.style.display = 'block';
  });

  // --- canvas size handlers ---
  refs.sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.size;

      if (s === 'custom') {
        const w = Number(prompt('Width in px', 800));
        const h = Number(prompt('Height in px', 800));
        if (w > 0 && h > 0) setStageSize(w, h);
        return;
      }

      if (s.includes('x')) {
        const [w, h] = s.split('x').map(Number);
        setStageSize(w, h);
        return;
      }

      const n = Number(s);
      setStageSize(n, n);
    });
  });

  function setStageSize(w, h) {
    refs.stage.style.width = w + 'px';
    refs.stage.style.height = h + 'px';
  }

  // --- Add Text ---
  refs.addTextBtn.addEventListener('click', () => {
    const txt = refs.addTextInput.value.trim();
    if (!txt) return;
    addTextItem(txt);
    refs.addTextInput.value = '';
  });

  function addTextItem(text) {
    const el = document.createElement('div');
    el.className = 'item text-item';
    el.contentEditable = true;
    el.innerText = text;
    el.style.left = '15%';
    el.style.top = '15%';
    el.style.fontSize = '34px';

    makeInteractive(el);
    refs.stageInner.appendChild(el);
  }

  // --- Add Sticker ---
  function addSticker(s) {
    const el = document.createElement('div');
    el.className = 'item sticker-item';
    el.style.left = '20%';
    el.style.top = '20%';
    el.style.width = '120px';
    el.style.height = '120px';

    if (s.type === 'emoji') {
      el.innerHTML = `<div style="font-size:48px;text-align:center">${s.value}</div>`;
    } else {
      el.innerHTML = `<img src="${s.value}" style="width:100%;height:100%;object-fit:contain"/>`;
    }

    makeInteractive(el);
    refs.stageInner.appendChild(el);
  }

  // -------------------------------------------
  // MAKE ELEMENT INTERACTIVE
  // NO OUTLINE ADDED HERE!
  // -------------------------------------------
  function makeInteractive(el) {
    el.dataset.rotate = 0;

    // Select
    el.addEventListener('pointerdown', (e) => {
      selectElement(el);
      startDrag(e, el);
    });

    // Resize & rotate handles (only two)
    const br = document.createElement('div');
    br.className = 'handle br';
    el.appendChild(br);

    const rot = document.createElement('div');
    rot.className = 'handle rotate';
    el.appendChild(rot);

    br.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      startResize(ev, el);
    });

    rot.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      startRotate(ev, el);
    });

    // Double click to edit text OR remove sticker
    el.addEventListener('dblclick', () => {
      if (el.classList.contains('text-item')) {
        el.focus();
      } else {
        if (confirm('Remove this?')) el.remove();
      }
    });
  }

  function selectElement(el) {
    if (selected) selected.classList.remove('active');
    selected = el;
    selected.classList.add('active');
  }

  // --- Layer Controls ---
  refs.bringForward.addEventListener('click', () => {
    if (!selected) return;
    selected.style.zIndex =
      (Number(selected.style.zIndex) || 10) + 1;
  });

  refs.sendBack.addEventListener('click', () => {
    if (!selected) return;
    selected.style.zIndex =
      (Number(selected.style.zIndex) || 10) - 1;
  });

  // --- Drag ---
  function startDrag(e, el) {
    e.preventDefault();

    const rect = refs.stageInner.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const leftPercent = parseFloat(el.style.left) || 0;
    const topPercent = parseFloat(el.style.top) || 0;

    const leftPx = (leftPercent / 100) * rect.width;
    const topPx = (topPercent / 100) * rect.height;

    const dx = startX - rect.left - leftPx;
    const dy = startY - rect.top - topPx;

    function onMove(ev) {
      const nx = ev.clientX - rect.left - dx;
      const ny = ev.clientY - rect.top - dy;

      const clampX = Math.max(0, Math.min(rect.width - el.offsetWidth, nx));
      const clampY = Math.max(0, Math.min(rect.height - el.offsetHeight, ny));

      el.style.left = (clampX / rect.width) * 100 + "%";
      el.style.top = (clampY / rect.height) * 100 + "%";
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- Resize ---
  function startResize(e, el) {
    e.preventDefault();

    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev) {
      el.style.width = Math.max(32, startW + (ev.clientX - startX)) + "px";
      el.style.height = Math.max(24, startH + (ev.clientY - startY)) + "px";
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- Rotate ---
  function startRotate(e, el) {
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    function onMove(ev) {
      const angle =
        Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;

      el.style.transform = `rotate(${angle}deg)`;
      el.dataset.rotate = angle;
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- draw image helper ---
  function drawImageToCanvas(ctx, imgEl, w, h, dx = 0, dy = 0) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        ctx.drawImage(img, dx, dy, w, h);
        resolve();
      };

      img.onerror = () => resolve();

      img.src = imgEl.src;

      if (img.complete) setTimeout(() => resolve(), 20);
    });
  }

  // --- Export PNG ---
  refs.downloadBtn.addEventListener('click', async () => {
    const w = refs.stage.clientWidth;
    const h = refs.stage.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Background image
    if (refs.bgImg.src)
      await drawImageToCanvas(ctx, refs.bgImg, w, h);

    // Items
    const items = Array.from(
      refs.stageInner.querySelectorAll(".item")
    ).sort(
      (a, b) =>
        (Number(a.style.zIndex) || 10) -
        (Number(b.style.zIndex) || 10)
    );

    for (const it of items) {
      const left = (parseFloat(it.style.left) / 100) * w || 0;
      const top = (parseFloat(it.style.top) / 100) * h || 0;
      const iw = it.offsetWidth;
      const ih = it.offsetHeight;
      const rot = parseFloat(it.dataset.rotate) || 0;

      ctx.save();
      ctx.translate(left + iw / 2, top + ih / 2);
      ctx.rotate((rot * Math.PI) / 180);

      if (it.classList.contains("sticker-item")) {
        const img = it.querySelector("img");

        if (img) {
          await drawImageToCanvas(
            ctx,
            img,
            iw,
            ih,
            -iw / 2,
            -ih / 2
          );
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = Math.min(iw, ih) + "px serif";
          ctx.fillText(it.innerText.trim(), 0, 0);
        }
      } 

      else if (it.classList.contains("text-item")) {
        const style = getComputedStyle(it);
        const bg = style.backgroundColor;

        if (bg && bg !== "rgba(0, 0, 0, 0)") {
          ctx.fillStyle = bg;
          ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
        }

        const color = style.color || "#000";
        const fontSize = parseFloat(style.fontSize) || 28;

        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px Inter, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const lines = it.innerText.split("\n");

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(
            lines[i],
            0,
            (i - (lines.length - 1) / 2) *
              (fontSize + 6)
          );
        }
      }

      ctx.restore();
    }

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");

    a.href = url;
    a.download = "memeforge.png";
    a.click();
  });

  // --- Reset Canvas ---
  refs.resetBtn.addEventListener("click", () => {
    if (!confirm("Clear canvas and remove all elements?")) return;

    refs.stageInner
      .querySelectorAll(".item")
      .forEach((n) => n.remove());

    refs.bgImg.src = "";
    refs.bgImg.style.display = "none";

    selected = null;
  });

  // --- Deselect when clicking blank area ---
  refs.stageInner.addEventListener("pointerdown", (e) => {
    if (e.target === refs.stageInner || e.target === refs.bgImg) {
      if (selected) selected.classList.remove("active");
      selected = null;
    }
  });

  // --- Init ---
  setStageSize(800, 800);
  initStickers();
})();
