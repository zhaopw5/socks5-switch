const $ = (id) => document.getElementById(id);

const LEVEL_TEXT = {
  controlled_by_this_extension: ['已接管', 'on'],
  controllable_by_this_extension: ['可接管', ''],
  controlled_by_other_extensions: ['被其他扩展接管', 'warn'],
  not_controllable: ['被策略锁定', 'bad'],
};

function setResult(text, kind) {
  const el = $('result');
  el.textContent = text;
  el.className = kind || '';
}

function paint(info) {
  if (!info) return;
  const { store, levelOfControl } = info;
  const [text, cls] = LEVEL_TEXT[levelOfControl] || ['未知', 'warn'];

  $('state').textContent = text;
  $('state').className = cls;
  $('toggle').checked = !!store.enabled;
  $('host').value = store.host || '127.0.0.1';
  $('port').value = store.port || 8081;

  const locked = levelOfControl === 'not_controllable';
  $('toggle').disabled = locked;
  $('test').disabled = locked;
  $('direct').disabled = locked;
  $('control').textContent =
    levelOfControl === 'not_controllable'
      ? '企业策略不允许扩展改代理，设置写了也不生效。'
      : levelOfControl === 'controlled_by_other_extensions'
        ? '还有别的代理扩展在生效（如 iguge / FoxyProxy），先停用它。'
        : '';
}

async function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function refresh() {
  const info = await send({ type: 'status' });
  paint(info);
}

async function applyPatch(patch) {
  const res = await send({ type: 'apply', patch });
  if (res && res.ok) {
    paint(res);
  } else {
    paint(res);
    setResult('设置失败：' + ((res && res.error) || '未知'), 'err');
  }
  return res;
}

$('toggle').addEventListener('change', async (e) => {
  const on = e.target.checked;
  setResult(on ? '已启用，正在测试…' : '已关闭代理，恢复直连');
  await applyPatch({ enabled: on });
  const info = await send({ type: 'status' });
  paint(info);
  if (on) {
    const r = await send({ type: 'test' });
    if (r && r.ok) setResult(`已启用 · 出口 IP ${r.ip} · ${r.ms} ms`, 'ok');
    else setResult('已启用，但测试失败：' + ((r && r.error) || '未知') + '（若页面打不开请点“恢复直连”）', 'err');
  }
});

async function commitEndpoint() {
  const host = $('host').value.trim() || '127.0.0.1';
  const port = Number($('port').value) || 8081;
  await applyPatch({ host, port });
  if ($('toggle').checked) {
    const r = await send({ type: 'test' });
    if (r && r.ok) setResult(`出口 IP ${r.ip} · ${r.ms} ms`, 'ok');
    else setResult('测试失败：' + ((r && r.error) || '未知'), 'err');
  }
}

$('host').addEventListener('change', commitEndpoint);
$('port').addEventListener('change', commitEndpoint);

$('test').addEventListener('click', async () => {
  setResult('测试中…');
  const r = await send({ type: 'test' });
  if (r && r.ok) setResult(`出口 IP ${r.ip} · ${r.ms} ms`, 'ok');
  else setResult(`失败：${(r && r.error) || '未知'}`, 'err');
});

$('direct').addEventListener('click', async () => {
  await applyPatch({ enabled: false });
  setResult('已恢复直连');
});

refresh().catch((e) => setResult('读取失败：' + e.message, 'err'));
