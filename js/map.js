// ── map.js — camera coverage canvas with Google Maps Static API ─

const MapView = (() => {
  let canvas, ctx;
  let cameras = [];
  let selectedIdx = null;
  let currentTool = 'place';
  let activePlaceProduct = null;
  let isDragging = false, dragIdx = -1, dragStartAngle = 0, dragStartX = 0;
  let onChangeCallback = null;

  let mapState = {
    loaded:  false,
    loading: false,
    img:     null,
    address: null,
    zoom:    20,
    source:  'demo', // 'google' | 'demo'
  };

  const CAM_HIT_RADIUS = 18;

  function init(canvasEl, onChangeCb) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    onChangeCallback = onChangeCb;
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('resize', resize);
    resize();
  }

  function resize() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    if (mapState.loaded && mapState.coords) {
      loadMapForAddress(mapState.coords);
    } else {
      draw();
    }
  }

  function setTool(tool) {
    currentTool = tool;
    canvas.style.cursor = tool === 'delete' ? 'not-allowed' : tool === 'rotate' ? 'grab' : 'crosshair';
  }

  function setActivePlaceProduct(p) { activePlaceProduct = p; }
  function setCameras(cams) { cameras = cams || []; draw(); }
  function getCameras() { return cameras; }

  async function searchAddress(address) {
    if (!address.trim()) return null;
    const query = address.toLowerCase().includes('australia') ? address : address + ', Australia';
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=au`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (!data.length) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    } catch (err) {
      console.error('Geocode error:', err); return null;
    }
  }

  async function loadMapForAddress(coords) {
    mapState.loading = true;
    mapState.coords  = coords;
    mapState.img     = null;
    mapState.loaded  = false;
    draw();

    const w    = Math.max(Math.min(canvas.width,  640), 100);
    const h    = Math.max(Math.min(canvas.height, 640), 100);
    const zoom = mapState.zoom;

    // Call Supabase Edge Function proxy -- API key lives server-side only
    const SUPABASE_URL  = (typeof window.SUPABASE_URL  !== 'undefined') ? window.SUPABASE_URL  : (typeof SUPABASE_URL  !== 'undefined' ? SUPABASE_URL  : '');
    const SUPABASE_ANON = (typeof window.SUPABASE_ANON !== 'undefined') ? window.SUPABASE_ANON : (typeof SUPABASE_ANON !== 'undefined' ? SUPABASE_ANON : '');

    let authToken = SUPABASE_ANON;
    try {
      const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) authToken = session.access_token;
    } catch(e) {}

    const proxyUrl = `${SUPABASE_URL}/functions/v1/maps-proxy`
      + `?lat=${coords.lat}&lng=${coords.lng}`
      + `&zoom=${zoom}&w=${w}&h=${h}`;

    return new Promise((resolve) => {
      fetch(proxyUrl, { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => {
        if (!r.ok) throw new Error('proxy ' + r.status);
        return r.blob();
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          mapState.img = img; mapState.loaded = true;
          mapState.loading = false; mapState.source = 'google';
          draw(); resolve(true);
        };
        img.onerror = () => { mapState.loading = false; draw(); resolve(false); };
        img.src = objectUrl;
      })
      .catch(() => { mapState.loading = false; mapState.source = 'demo'; draw(); resolve(false); });
    });
  }

  function clearMap() {
    mapState = { loaded: false, loading: false, img: null, coords: null, zoom: 20, source: 'demo' };
    draw();
  }

  function setZoom(z) {
    mapState.zoom = Math.max(15, Math.min(21, z));
    if (mapState.address) loadMapForAddress(mapState.address);
  }

  function draw() {
    if (!canvas) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (mapState.loading) { drawLoading(w, h); return; }
    if (mapState.loaded && mapState.img) {
      const img = mapState.img;
      const imgW = img.naturalWidth / 2, imgH = img.naturalHeight / 2;
      const scale = Math.max(w / imgW, h / imgH);
      const dw = imgW * scale, dh = imgH * scale;
      const dx = (w - dw) / 2, dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      const grad = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f1419'; ctx.fillRect(0, 0, w, h); drawDemoProperty(w, h);
    }
    cameras.forEach((cam, i) => drawFOV(cam, i === selectedIdx));
    cameras.forEach((cam, i) => drawIcon(cam, i === selectedIdx));
  }

  let _raf = null;
  function drawLoading(w, h) {
    ctx.fillStyle = '#0a0c0f'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const t = Date.now() / 300;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - t;
      const x = cx + Math.cos(angle) * 22, y = cy + Math.sin(angle) * 22;
      ctx.fillStyle = `rgba(41,171,226,${(0.15 + 0.85 * (i / 8)).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(41,171,226,0.7)';
    ctx.font = 'bold 13px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Loading satellite imagery...', cx, cy + 46);
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => { if (mapState.loading) draw(); });
  }

  function drawDemoProperty(w, h) {
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#1a2030'; ctx.fillRect(0, h - 50, w, 50);
    const pW = Math.min(w * 0.72, 340), pH = Math.min(h * 0.55, 230);
    const pX = cx - pW / 2, pY = cy - pH / 2 - 10;
    ctx.fillStyle = '#0d1a12'; ctx.fillRect(pX - 40, pY - 30, pW + 80, pH + 70);
    ctx.fillStyle = '#1c2535'; ctx.fillRect(pX, pY, pW, pH);
    ctx.strokeStyle = '#2a3a50'; ctx.lineWidth = 1.5; ctx.strokeRect(pX, BY wW, pH);
    ctx.fillStyle = 'rgba(41,171,226,0.3)';
    ctx.font = `500 ${Math.max(10, w * 0.022)}px Barlow, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Search an address above for satellite view', cx, pY - 22);
  }

  function drawTree(x, y) {
    ctx.fillStyle = '#0f2018';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  }

  function hexToRgb(hex) {
    hex = (hex || '#29ABE2').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }

  function drawFOV(cam, selected) {
    if (!cam.fov_deg || !cam.range_m) return;
    const fovRad = (cam.fov_deg * Math.PI) / 180;
    const range = cam.range_m * (canvas.height / 300);
    const angle = (cam.angle || 270) * (Math.PI / 180);
    const { r, g, b } = hexToRgb(cam.color);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.arc(cam.x, cam.y, range, angle - fovRad / 2, angle + fovRad / 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${selected ? 0.28 : 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},${selected ? 0.9 : 0.55})`;
    ctx.lineWidth = selected ? 2 : 1.5; ctx.stroke(); ctx.restore();
  }

  function drawIcon(cam, selected) {
    const size = selected ? 11 : 9;
    const color = cam.color || '#29ABE2';
    ctx.save();
    ctx.translate(cam.x, cam.y);
    if (selected) {
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = selected ? color : 'rgba(10,14,20,0.88)';
    ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#fff' : color; ctx.fill();
    if (cam.label) {
      const fs = Math.max(9, canvas.width * 0.022);
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 5;
      ctx.font = `bold ${fs}px Barlow Condensed, sans-serif`;
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(cam.label, 0, -size - 4); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function hitTest(x, y) {
    for (let i = cameras.length - 1; i >= 0; i--) {
      if (Math.hypot(x - cameras[i].x, y - cameras[i].y) < CAM_HIT_RADIUS) return i;
    }
    return -1;
  }

  function handleTap(x, y) {
    if (currentTool === 'delete') {
      const idx = hitTest(x, y); if (idx >= 0) { removeCamera(idx); return; }
    }
    const idx = hitTest(x, y);
    if (idx >= 0) {
      selectedIdx = idx; draw();
      if (onChangeCallback) onChangeCallback('select', cameras[idx], idx); return;
    }
    selectedIdx = null;
    if (onChangeCallback) onChangeCallback('deselect', null, null);
    if (currentTool === 'place' && activePlaceProduct) { placeCamera(x, y); }
    else { draw(); }
  }

  function placeCamera(x, y) {
    const cam = { x, y, angle: 270, product_id: activePlaceProduct.id, name: activePlaceProduct.name, model: activePlaceProduct.model, fov_deg: activePlaceProduct.fov_deg, range_m: activePlaceProduct.range_m, color: activePlaceProduct.color, label: `CAM${cameras.length + 1}` };
    cameras.push(cam); selectedIdx = cameras.length - 1; draw();
    if (onChangeCallback) onChangeCallback('place', cam, selectedIdx);
  }

  function removeCamera(idx) {
    const cam = cameras[idx]; cameras.splice(idx, 1);
    if (selectedIdx === idx) selectedIdx = null;
    else if (selectedIdx > idx) selectedIdx--;
    draw(); if (onChangeCallback) onChangeCallback,�'remove', cam, idx);
  }

  function removeSelected() { if (selectedIdx !== null) removeCamera(selectedIdx); }
  function rotateSelected(delta = 45) {
    if (selectedIdx === null) return;
    cameras[selectedIdx].angle = ((cameras[selectedIdx].angle || 270) + delta + 360) % 360;
    draw(); if (onChangeCallback) onChangeCallback,�'rotate', cameras[selectedIdx], selectedIdx);
  }
  function clearAll() {
    cameras = []; selectedIdx = null; draw();
    if (onChangeCallback) onChangeCallback('clear', null, null);
  }

  let touchStartX2 = 0;
  function onCanvasClick(e) { const rect = canvas.getBoundingClientRect(); handleTap(e.clientX - rect.left, e.clientY - rect.top); }
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0], rect = canvas.getBoundingClientRect();
    touchStartX2 = t.clientX - rect.left;
    if (currentTool === 'rotate') {
      const ty = t.clientY - rect.top, idx = hitTest(touchStartX2, ty);
      if (idx >= 0) { isDragging = true; dragIdx = idx; selectedIdx = idx; dragStartX = touchStartX2; dragStartAngle = cameras[idx].angle || 270; }
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (!isDragging || dragIdx < 0) return;
    const t = e.touches[0], rect = canvas.getBoundingClientRect();
    cameras[dragIdx].angle = (dragStartAngle + (t.clientX - rect.left - dragStartX) * 1.5 + 360) % 360;
    draw(); if (onChangeCallback) onChangeCallback('rotate', cameras[dragIdx], dragIdx);
  }
  function onTouchEnd(e) {
    e.preventDefault();
    if (!isDragging) { const t = e.changedTouches[0], rect = canvas.getBoundingClientRect(); handleTap(t.clientX - rect.left, t.clientY - rect.top); }
    isDragging = false; dragIdx = -1;
  }

  function showToastExternal(msg) {
    if (typeof showToast === 'function') showToast(msg, 'error');
    else console.warn(msg);
  }

  return {
    init, resize, setTool, setActivePlaceProduct,
    setCameras, getCameras, rotateSelected, removeSelected, clearAll,
    searchAddress, loadMapForAddress, clearMap, setZoom,
    getMapSource: () => mapState.source,
    isLoaded: () => mapState.loaded,
    getSelected: () => selectedIdx !== null ? cameras[selectedIdx] : null,
    getSelectedIdx: () => selectedIdx,
    draw,
  };
})();
