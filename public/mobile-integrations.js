(function mobileIntegrationsModule(global) {
  'use strict';

  let cameraStream = null;
  let orientationHandler = null;
  let motionHandler = null;
  let lastMotionUpdate = 0;
  let nfcController = null;
  let installPrompt = null;

  global.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  global.addEventListener('appinstalled', () => { installPrompt = null; });

  const capabilities = () => ({
    camera: Boolean(navigator.mediaDevices?.getUserMedia),
    barcode: Boolean(navigator.mediaDevices?.getUserMedia && global.BarcodeDetector),
    location: Boolean(navigator.geolocation),
    sensors: Boolean(global.DeviceOrientationEvent || global.DeviceMotionEvent),
    vibration: Boolean(navigator.vibrate),
    share: Boolean(navigator.share),
    clipboard: Boolean(navigator.clipboard && global.isSecureContext),
    connectivity: true,
    nfc: Boolean(global.NDEFReader),
    install: true
  });

  const featureList = [
    ['camera', '📷'], ['barcode', '▦'], ['location', '⌖'], ['sensors', '◉'], ['vibration', '〰'],
    ['share', '↗'], ['clipboard', '▣'], ['connectivity', '◌'], ['nfc', 'N'], ['install', '＋']
  ];

  function render({ translate: t, escape: esc }) {
    const support = capabilities();
    const cards = featureList.map(([id, icon]) => `<article class="mobile-capability">
      <div class="mobile-capability__head"><span class="mobile-capability__icon" aria-hidden="true">${esc(icon)}</span><div><h3>${esc(t(`mobile_${id}_title`))}</h3><span class="capability-state ${support[id] ? 'is-supported' : 'is-unsupported'}">${esc(t(support[id] ? 'mobile_supported' : 'mobile_unsupported'))}</span></div></div>
      <p>${esc(t(`mobile_${id}_help`))}</p>
      <button type="button" data-mobile-action="${esc(id)}" ${support[id] ? '' : 'disabled'}>${esc(t(`mobile_${id}_action`))}</button>
      <output class="mobile-result" data-mobile-result="${esc(id)}" aria-live="polite">${esc(t('mobile_ready_to_test'))}</output>
    </article>`).join('');
    return `<div data-mobile-integrations><div class="mobile-demo-notice">${esc(t('mobile_permission_notice'))}</div><div class="mobile-capabilities">${cards}</div><div class="camera-preview hide" data-camera-preview><video playsinline muted aria-label="${esc(t('mobile_camera_preview'))}"></video><button type="button" class="ghost" data-mobile-action="stop_camera">${esc(t('mobile_camera_stop'))}</button></div></div>`;
  }

  function result(root, id, message, state = '') {
    const output = root?.querySelector(`[data-mobile-result="${id}"]`) || document.querySelector(`[data-mobile-result="${id}"]`);
    if (!output) return;
    output.textContent = message;
    output.dataset.state = state;
  }

  async function ensureCamera(root, t) {
    if (!cameraStream) cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const preview = root.querySelector('[data-camera-preview]');
    const video = preview?.querySelector('video');
    if (preview && video) {
      preview.classList.remove('hide'); video.srcObject = cameraStream; await video.play();
      if (video.readyState < 2) await new Promise(resolve => {
        const timer = global.setTimeout(resolve, 3000);
        video.addEventListener('loadeddata', () => { global.clearTimeout(timer); resolve(); }, { once: true });
      });
    }
    result(root, 'camera', t('mobile_camera_active'), 'success');
    return video;
  }

  function stopCamera(root, t) {
    cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null;
    const preview = root?.querySelector('[data-camera-preview]'); const video = preview?.querySelector('video');
    if (video) video.srcObject = null; preview?.classList.add('hide');
    if (root && t) result(root, 'camera', t('mobile_camera_stopped'));
  }

  async function requestSensorPermission(ctor) {
    if (typeof ctor?.requestPermission !== 'function') return true;
    return (await ctor.requestPermission()) === 'granted';
  }

  async function startSensors(root, t) {
    const orientationAllowed = await requestSensorPermission(global.DeviceOrientationEvent);
    const motionAllowed = await requestSensorPermission(global.DeviceMotionEvent);
    if (!orientationAllowed && !motionAllowed) throw new Error('permission');
    if (orientationHandler) global.removeEventListener('deviceorientation', orientationHandler);
    if (motionHandler) global.removeEventListener('devicemotion', motionHandler);
    orientationHandler = event => {
      const values = [event.alpha, event.beta, event.gamma].map(value => Number.isFinite(value) ? value.toFixed(1) : '—');
      result(root, 'sensors', `${t('mobile_orientation_values')}: α ${values[0]}°, β ${values[1]}°, γ ${values[2]}°`, 'success');
    };
    motionHandler = event => {
      if (!event.rotationRate && !event.accelerationIncludingGravity) return;
      if (Date.now() - lastMotionUpdate < 250) return;
      lastMotionUpdate = Date.now();
      const rate = event.rotationRate || {}; const acceleration = event.accelerationIncludingGravity || {};
      const values = [rate.alpha, rate.beta, rate.gamma, acceleration.x, acceleration.y, acceleration.z]
        .map(value => Number.isFinite(value) ? value.toFixed(1) : '—');
      result(root, 'sensors', `${t('mobile_motion_values')}: α ${values[0]}, β ${values[1]}, γ ${values[2]} · x ${values[3]}, y ${values[4]}, z ${values[5]}`, 'success');
    };
    global.addEventListener('deviceorientation', orientationHandler);
    global.addEventListener('devicemotion', motionHandler);
    result(root, 'sensors', t('mobile_sensors_active'), 'success');
  }

  async function run(action, { translate: t, root }) {
    if (!root) return;
    try {
      if (action === 'stop_camera') { stopCamera(root, t); return; }
      if (action === 'camera') { await ensureCamera(root, t); return; }
      if (action === 'barcode') {
        const video = await ensureCamera(root, t); const detector = new BarcodeDetector(); const codes = await detector.detect(video);
        result(root, 'barcode', codes.length ? `${t('mobile_barcode_result')}: ${codes.map(code => code.rawValue).join(', ')}` : t('mobile_barcode_none'), codes.length ? 'success' : ''); return;
      }
      if (action === 'location') {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }));
        result(root, 'location', `${t('mobile_location_result')}: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)} (±${Math.round(position.coords.accuracy)} m)`, 'success'); return;
      }
      if (action === 'sensors') { await startSensors(root, t); return; }
      if (action === 'vibration') { navigator.vibrate([100, 60, 140]); result(root, 'vibration', t('mobile_vibration_done'), 'success'); return; }
      if (action === 'share') { await navigator.share({ title: t('app_title'), text: t('mobile_share_text'), url: global.location.href }); result(root, 'share', t('mobile_share_done'), 'success'); return; }
      if (action === 'clipboard') { await navigator.clipboard.writeText(global.location.href); result(root, 'clipboard', t('mobile_clipboard_done'), 'success'); return; }
      if (action === 'connectivity') {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const battery = navigator.getBattery ? await navigator.getBattery() : null;
        const parts = [navigator.onLine ? t('mobile_online') : t('mobile_offline')];
        if (connection?.effectiveType) parts.push(`${t('mobile_network_type')}: ${connection.effectiveType}`);
        if (battery) parts.push(`${t('mobile_battery_level')}: ${Math.round(battery.level * 100)}%${battery.charging ? ` · ${t('mobile_charging')}` : ''}`);
        result(root, 'connectivity', parts.join(' · '), 'success'); return;
      }
      if (action === 'nfc') {
        nfcController?.abort(); nfcController = new AbortController(); const reader = new NDEFReader();
        reader.addEventListener('reading', event => result(root, 'nfc', `${t('mobile_nfc_detected')}: ${event.serialNumber || t('mobile_nfc_tag')}`, 'success'));
        await reader.scan({ signal: nfcController.signal }); result(root, 'nfc', t('mobile_nfc_waiting'));
        global.setTimeout(() => nfcController?.abort(), 30000); return;
      }
      if (action === 'install') {
        if (global.matchMedia('(display-mode: standalone)').matches || navigator.standalone) { result(root, 'install', t('mobile_install_installed'), 'success'); return; }
        if (!installPrompt) { result(root, 'install', t('mobile_install_browser_help')); return; }
        installPrompt.prompt(); const choice = await installPrompt.userChoice;
        result(root, 'install', t(choice.outcome === 'accepted' ? 'mobile_install_accepted' : 'mobile_install_dismissed'), choice.outcome === 'accepted' ? 'success' : ''); installPrompt = null;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      result(root, action === 'stop_camera' ? 'camera' : action, t(error?.name === 'NotAllowedError' || error?.message === 'permission' ? 'mobile_permission_denied' : 'mobile_action_failed'), 'error');
    }
  }

  function stop() {
    stopCamera();
    if (orientationHandler) global.removeEventListener('deviceorientation', orientationHandler);
    if (motionHandler) global.removeEventListener('devicemotion', motionHandler);
    orientationHandler = null; motionHandler = null; lastMotionUpdate = 0; nfcController?.abort(); nfcController = null;
  }

  global.MobileIntegrations = { render, run, stop };
})(window);
