(function () {
  const seen = new WeakSet();

  function serialize(obj, depth, path) {
    if (depth > 8) return '[MaxDepth]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'symbol') return obj.toString();
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'bigint') return obj;

    if (typeof obj === 'object' && seen.has(obj)) return '[Circular]';
    if (typeof obj === 'object') seen.add(obj);

    if (typeof obj === 'function') return `[Function: ${obj.name || 'anonymous'}]`;

    if (obj instanceof Node) return `[${obj.constructor.name}]`;

    if (obj instanceof Location) return obj.href;
    if (obj instanceof RegExp) return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    if (obj instanceof Error) return `[${obj.name}: ${obj.message}]`;
    if (obj instanceof Promise) return '[Promise]';
    if (typeof obj === 'object' && obj instanceof URLSearchParams) return obj.toString();
    if (typeof Storage !== 'undefined' && obj instanceof Storage) {
      const r = {};
      for (let i = 0; i < obj.length; i++) { const k = obj.key(i); r[k] = obj.getItem(k); }
      return r;
    }
    if (typeof TimeRanges !== 'undefined' && obj instanceof TimeRanges) return `[TimeRanges: ${obj.length}]`;
    if (typeof PluginArray !== 'undefined' && obj instanceof PluginArray) return Array.from(obj).map(p => ({ name: p.name, filename: p.filename, description: p.description }));
    if (typeof MimeTypeArray !== 'undefined' && obj instanceof MimeTypeArray) return Array.from(obj).map(m => m.type);
    if (typeof DOMStringMap !== 'undefined' && obj instanceof DOMStringMap) {
      const r = {}; for (const k of Object.keys(obj)) r[k] = obj[k]; return r;
    }
    if (typeof CSSStyleDeclaration !== 'undefined' && obj instanceof CSSStyleDeclaration) return obj.cssText;
    if (typeof NamedNodeMap !== 'undefined' && obj instanceof NamedNodeMap) {
      return Array.from(obj).map(a => ({ name: a.name, value: a.value }));
    }

    if (Array.isArray(obj)) return obj.map((item, i) => serialize(item, depth + 1, `${path}[${i}]`));

    if (obj instanceof Map) return { type: 'Map', size: obj.size, entries: Array.from(obj.entries()).map(([k, v]) => [serialize(k, depth + 1), serialize(v, depth + 1)]) };
    if (obj instanceof Set) return { type: 'Set', size: obj.size, values: Array.from(obj).map(v => serialize(v, depth + 1)) };

    if (ArrayBuffer.isView(obj) && !(obj instanceof DataView)) return `[${obj.constructor.name}: length=${obj.length}]`;
    if (obj instanceof ArrayBuffer) return `[ArrayBuffer: byteLength=${obj.byteLength}]`;
    if (obj instanceof DataView) return `[DataView: byteLength=${obj.byteLength}]`;

    const result = {};
    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
      if (key.startsWith('__')) continue;
      try {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc && typeof desc.get === 'function') {
          try { result[key] = serialize(obj[key], depth + 1, `${path}.${key}`); } catch (e) { result[key] = `[Getter Error: ${e.message}]`; }
        } else {
          const val = obj[key];
          if (typeof val === 'function') {
            if (val.name && val.name[0] === val.name[0].toUpperCase() && val.prototype) {
              continue;
            }
            result[key] = `[Function: ${val.name || 'anonymous'}]`;
          } else {
            result[key] = serialize(val, depth + 1, `${path}.${key}`);
          }
        }
      } catch (e) {
        result[key] = `[Error: ${e.message}]`;
      }
    }
    return result;
  }

  function collectNavigator() {
    const nav = {};
    const props = [
      'appCodeName', 'appName', 'appVersion', 'userAgent', 'platform',
      'language', 'languages', 'cookieEnabled', 'doNotTrack',
      'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints',
      'onLine', 'pdfViewerEnabled', 'webdriver', 'vendor', 'vendorSub',
      'product', 'productSub', 'mimeTypes', 'plugins',
      'connection', 'storage', 'geolocation', 'mediaDevices',
      'permissions', 'credentials', 'clipboard', 'keyboard',
      'locks', 'mediaCapabilities', 'mediaSession', 'presentation',
      'serviceWorker', 'storage', 'wakeLock', 'xr',
      'bluetooth', 'hid', 'serial', 'usb',
      'gpu', 'virtualKeyboard', 'userAgentData'
    ];
    for (const p of props) {
      try {
        const val = navigator[p];
        if (val === undefined) continue;
        if (typeof val === 'function') { nav[p] = `[Function]`; continue; }
        nav[p] = serialize(val, 0, `navigator.${p}`);
      } catch (e) { nav[p] = `[Error: ${e.message}]`; }
    }
    try {
      const conn = navigator.connection;
      if (conn) {
        nav.connection = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
          type: conn.type,
          downlinkMax: conn.downlinkMax
        };
      }
    } catch (e) {}
    try {
      if (navigator.userAgentData) {
        const uad = navigator.userAgentData;
        nav.userAgentData = {
          brands: uad.brands,
          mobile: uad.mobile,
          platform: uad.platform
        };
      }
    } catch (e) {}
    return nav;
  }

  function collectScreen() {
    const s = {};
    const props = [
      'width', 'height', 'availWidth', 'availHeight',
      'colorDepth', 'pixelDepth', 'orientation',
      'availLeft', 'availTop', 'left', 'top'
    ];
    for (const p of props) {
      try { s[p] = screen[p]; } catch (e) {}
    }
    try {
      if (screen.orientation) {
        s.orientation = {
          type: screen.orientation.type,
          angle: screen.orientation.angle
        };
      }
    } catch (e) {}
    return s;
  }

  function collectPerformance() {
    try {
      const p = performance;
      const entries = p.getEntriesByType('navigation').map(e => ({
        name: e.name, type: e.type, startTime: e.startTime, duration: e.duration,
        domContentLoadedEventEnd: e.domContentLoadedEventEnd,
        loadEventEnd: e.loadEventEnd, responseEnd: e.responseEnd,
        transferSize: e.transferSize, encodedBodySize: e.encodedBodySize,
        decodedBodySize: e.decodedBodySize, protocol: e.nextHopProtocol
      }));
      return {
        timeOrigin: p.timeOrigin,
        navigation: entries
      };
    } catch (e) { return { error: e.message }; }
  }

  console.log('⏳ 正在采集 window 对象...');

  const result = {};

  result.__navigator = collectNavigator();
  result.__screen = collectScreen();
  result.__performance = collectPerformance();

  result.__viewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenX: window.screenX,
    screenY: window.screenY,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    pageXOffset: window.pageXOffset,
    pageYOffset: window.pageYOffset,
    visualViewport: window.visualViewport ? {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
      offsetLeft: window.visualViewport.offsetLeft,
      offsetTop: window.visualViewport.offsetTop,
      pageLeft: window.visualViewport.pageLeft,
      pageTop: window.visualViewport.pageTop,
      scale: window.visualViewport.scale
    } : null
  };

  try {
    result.__document = {
      title: document.title,
      URL: document.URL,
      documentURI: document.documentURI,
      compatMode: document.compatMode,
      characterSet: document.characterSet,
      charset: document.charset,
      contentType: document.contentType,
      readyState: document.readyState,
      referrer: document.referrer,
      dir: document.dir,
      lang: document.lang,
      lastModified: document.lastModified,
      cookieEnabled: navigator.cookieEnabled,
      doctype: document.doctype ? document.doctype.name : null,
      body: document.body ? document.body.tagName : null,
      head: document.head ? document.head.tagName : null,
      links: document.links.length,
      forms: document.forms.length,
      images: document.images.length,
      scripts: document.scripts.length,
      styleSheets: document.styleSheets.length,
      embeds: document.embeds.length,
      plugins: document.plugins.length
    };
  } catch (e) { result.__document = { error: e.message }; }

  {
    const topSeen = new WeakSet();
    const constructorNames2 = new Set();
    for (const key of Object.getOwnPropertyNames(window)) {
      try { const val = window[key]; if (typeof val === 'function' && val.prototype && key[0] === key[0].toUpperCase()) constructorNames2.add(key); } catch (e) {}
    }
    const SKIP_ALWAYS = new Set([
      'window','self','frames','top','parent','opener','frameElement',
      'clientInformation','location','document','customElements',
      'history','navigation','locationbar','menubar','personalbar',
      'scrollbars','statusbar','toolbar','external','styleMedia',
      'visualViewport','scheduler','performance','trustedTypes',
      'crypto','indexedDB','localStorage','sessionStorage',
      'caches','cookieStore','crashReport','documentPictureInPicture',
      'sharedStorage','speechSynthesis','launchQueue','viewport',
      'fence','navigator','screen'
    ]);
    function serializeTop(obj, depth) {
      if (depth > 6) return '[MaxDepth]';
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'symbol') return obj.toString();
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'bigint') return obj;
      if (typeof obj === 'object' && topSeen.has(obj)) return '[Circular]';
      if (typeof obj === 'object') topSeen.add(obj);
      if (typeof obj === 'function') return '[Function]';
      if (obj instanceof Node) return '[' + obj.constructor.name + ']';
      if (obj instanceof Location) return obj.href;
      if (obj instanceof RegExp) return obj.toString();
      if (obj instanceof Date) return obj.toISOString();
      if (typeof Storage !== 'undefined' && obj instanceof Storage) { const r = {}; for (let i = 0; i < obj.length; i++) { const k = obj.key(i); r[k] = obj.getItem(k); } return r; }
      if (Array.isArray(obj)) return obj.map(item => serializeTop(item, depth + 1));
      if (obj instanceof Map) return { type: 'Map', size: obj.size };
      if (obj instanceof Set) return { type: 'Set', size: obj.size };
      const result = {};
      for (const key of Object.getOwnPropertyNames(obj)) {
        if (key.startsWith('__')) continue;
        try {
          const val = obj[key];
          if (typeof val === 'function') continue;
          result[key] = serializeTop(val, depth + 1);
        } catch (e) { result[key] = '[Error]'; }
      }
      return result;
    }
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key === 'globalThis') continue;
      if (SKIP_ALWAYS.has(key)) continue;
      if (constructorNames2.has(key)) continue;
      if (/^on[a-z]/.test(key)) continue;
      if (/^GPU(Buffer|Color|Map|Shader|Texture)/.test(key)) continue;
      try {
        const val = window[key];
        if (typeof val === 'function') continue;
        result[key] = serializeTop(val, 0);
      } catch (e) { result[key] = '[Error]'; }
    }
  }

  try { if (window.chrome) result.__chrome = serialize(window.chrome, 0, 'chrome'); } catch (e) {}

  const json = JSON.stringify(result, null, 2);
  console.log(json);
  console.log(`📊 总大小: ${(json.length / 1024).toFixed(1)} KB`);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'window-env.json';
  a.click();
  URL.revokeObjectURL(url);
  console.log('✅ 已下载为 window-env.json');

  return result;
})();
