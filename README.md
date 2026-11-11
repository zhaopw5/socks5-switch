# SOCKS5

一个最小可用的 Chrome/Edge SOCKS5 代理开关。不卖代理、不收集数据，只把你浏览器的常规流量指到本地端口。

配合 `ssh -D` 用最直接：

```bash
ssh -N -D 8081 user@server
```

然后插件里填 `127.0.0.1 : 8081`，打开开关。

## 装

1. `chrome://extensions`（Edge 是 `edge://extensions`）
2. 打开 **开发者模式**
3. **加载未打包的扩展程序** → 选这个目录

## 用

| 控件 | 作用 |
|---|---|
| 启用代理 | 写入 `fixed_servers`，走 SOCKS5；关掉写 `direct` |
| 主机 / 端口 | 改完自动重应用，并顺手测一次 |
| 测试连接 | 请求 `api.ipify.org`，显示出口 IP 和耗时 |
| 恢复直连 | 代理挂了时的救命按钮 |

工具栏图标会跟着状态变，不用点开面板也知道开没开：

| 图标 | 含义 |
|---|---|
| 蓝色 + 白色箭头 | 已启用，本扩展在生效 |
| 灰色 + 浅灰箭头 | 已关闭 |
| 蓝色 + 橙色 `!` 角标 | 已启用，但代理被别的扩展或策略接管了（实际没生效） |
| 悬停提示 | `SOCKS5 · 已启用` / `SOCKS5 · 已关闭` |

状态灯读的是 `chrome.proxy.settings.get().levelOfControl`：

- **已接管** —— 本扩展在生效
- **被其他扩展接管** —— 还有别的代理插件（iguge、FoxyProxy）在设，先停用它
- **被策略锁定** —— 企业策略禁止扩展改代理，写了也不生效

## 已知边界

- **不支持 SOCKS5 用户名/密码**：Chrome 的 `chrome.proxy` 没有这条路，带认证的代理连不上
- **全局，不分站点**：要按域名分流得写 PAC（`mode: "pac_script"`），本版没做
- **DNS 在代理端解析**：Chrome 的 `socks5` 把域名交给代理解析，不是本地解析
- **测不出"代理是否健康"**：浏览器没有这个 API，只能用一次真实请求近似判断
- 代理挂掉时整屏 `ERR_PROXY_CONNECTION_FAILED`，点「恢复直连」即可

## 权限

只要 `proxy` + `storage`，外加 `api.ipify.org` 用于测出口 IP。不读页面、不碰 cookie。

## License

MIT
