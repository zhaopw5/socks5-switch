// SOCKS5 —— 用 chrome.proxy 把常规流量指到本地 SOCKS5。
// 只做三件事：开关、读写配置、探活。不做 PAC、不做认证（Chrome 不支持 SOCKS5 认证）。
// 工具栏图标随状态切换：蓝色=已启用，灰色=已关闭；被别的扩展/策略接管时角标显示 !。

const DEFAULTS = { enabled: false, host: '127.0.0.1', port: 8081 };
const TEST_URL = 'https://api.ipify.org?format=json';

const ICONS = {
  on: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  off: { 16: 'icons/off/16.png', 32: 'icons/off/32.png', 48: 'icons/off/48.png', 128: 'icons/off/128.png' },
};

const getStore = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) });

const proxyGet = () =>
  new Promise((resolve) => chrome.proxy.settings.get({ incognito: false }, (details) => resolve(details)));

const proxySet = (value) =>
  new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value, scope: 'regular' }, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });

function fixedConfig(s) {
  return {
    mode: 'fixed_servers',
    rules: {
      singleProxy: { scheme: 'socks5', host: String(s.host || '127.0.0.1'), port: Number(s.port) || 8081 },
      bypassList: ['localhost', '127.0.0.1', '<local>'],
    },
  };
}

/** 工具栏图标 / 提示语 / 角标，反映真实状态。 */
async function paint(store, levelOfControl) {
  const on = !!store.enabled;
  try {
    await chrome.action.setIcon({ path: on ? ICONS.on : ICONS.off });
    await chrome.action.setTitle({ title: on ? 'SOCKS5 · 已启用' : 'SOCKS5 · 已关闭' });
  } catch {
    /* 图标设置失败不影响代理本身 */
  }

  const hijacked = on && levelOfControl && levelOfControl !== 'controlled_by_this_extension';
  try {
    await chrome.action.setBadgeText({ text: hijacked ? '!' : '' });
    if (hijacked) await chrome.action.setBadgeBackgroundColor({ color: '#b26a00' });
  } catch {
    /* 忽略 */
  }
}

async function describe() {
  const store = await getStore();
  const cur = await proxyGet();
  const info = {
    store,
    levelOfControl: cur && cur.levelOfControl,
    mode: cur && cur.value && cur.value.mode,
  };
  await paint(store, info.levelOfControl);
  return info;
}

async function apply(next) {
  const store = { ...(await getStore()), ...(next || {}) };
  await chrome.storage.local.set(store);
  try {
    await proxySet(store.enabled ? fixedConfig(store) : { mode: 'direct' });
    return { ok: true, ...(await describe()) };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e), ...(await describe()) };
  }
}

async function testConnection() {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(TEST_URL, { cache: 'no-store', signal: ctrl.signal });
    const j = await r.json();
    return { ok: true, ip: j && j.ip, ms: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - t0,
      error: e && e.name === 'AbortError' ? '超时（10s）' : String((e && e.message) || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const run = async () => {
    switch (msg && msg.type) {
      case 'status':
        return describe();
      case 'apply':
        return apply(msg.patch || {});
      case 'test':
        return testConnection();
      default:
        return { ok: false, error: 'unknown message' };
    }
  };
  run().then(sendResponse);
  return true;
});

// 别的扩展或策略改动代理时，图标跟着变
try {
  chrome.proxy.settings.onChange.addListener(() => {
    describe().catch(() => {});
  });
} catch {
  /* 老版本没有该事件 */
}

// 浏览器重启后按已保存的配置恢复，并刷一次图标
chrome.runtime.onStartup.addListener(async () => {
  const s = await getStore();
  if (s.enabled) apply({}).catch(() => {});
  else describe().catch(() => {});
});

chrome.runtime.onInstalled.addListener(async () => {
  const s = await getStore();
  if (s.enabled) apply({}).catch(() => {});
  else describe().catch(() => {});
});
