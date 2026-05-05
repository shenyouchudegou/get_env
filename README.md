# get_env.js

浏览器环境全量采集脚本。在浏览器控制台中运行，深度遍历并序列化 `window` 对象及其关键子对象，输出 JSON 并自动下载。


## 采集内容

| 模块 | 说明 |
|---|---|
| `__navigator` | 浏览器标识、语言、硬件并发数、设备内存、触控点数、连接信息、UA Client Hints 等 |
| `__screen` | 屏幕分辨率、可用区域、色深、方向 |
| `__performance` | 导航时序、传输大小、协议 |
| `__viewport` | 窗口内外尺寸、DPR、滚动偏移、Visual Viewport |
| `__document` | 标题、URL、字符集、兼容模式、DOM 节点统计 |
| `__chrome` | Chrome 特有的 `chrome` 对象 |
| 其他顶层属性 | 遍历 `window` 上所有非常量、非事件、非构造函数的属性 |

## 使用方法
1. 打开目标网页
2. 按 `F12` 打开开发者工具 → Console
3. 粘贴 `get_env.js` 的全部内容并回车
4. 脚本会：
   - 在控制台打印完整 JSON
   - 自动下载 `window-env.json` 文件

## 序列化规则

| 类型 | 输出 |
|---|---|
| 基本类型 | 原值 |
| `Function` | `[Function: name]` |
| `DOM Node` | `[NodeName]` |
| `Location` | `href` 字符串 |
| `RegExp` | 字符串表示 |
| `Date` | ISO 8601 |
| `Storage` | 键值对对象 |
| `Map` / `Set` | `{ type, size, entries/values }` |
| `TypedArray` | `[TypeName: length=N]` |
| 循环引用 | `[Circular]` |
| 超过深度限制 | `[MaxDepth]`（顶层 6 层，通用 8 层） |

## 配置项

可在脚本内调整以下常量：

- **`SKIP_ALWAYS`**（~行 140）：跳过已单独采集或无价值的 `window` 属性集合，按需增减
- **序列化深度**：`serialize()` 默认 8 层，`serializeTop()` 默认 6 层

## 输出示例

```json
{
  "__navigator": {
    "userAgent": "Mozilla/5.0 ...",
    "language": "zh-CN",
    "hardwareConcurrency": 8,
    "deviceMemory": 8,
    "connection": { "effectiveType": "4g", "downlink": 10, "rtt": 50 }
  },
  "__screen": { "width": 2560, "height": 1440, "colorDepth": 24 },
  "__viewport": { "innerWidth": 1920, "innerHeight": 969, "devicePixelRatio": 1 },
  "__document": { "title": "Example", "URL": "https://...", "forms": 0, "images": 12 }
}
```

## 注意事项

- 仅在浏览器环境运行（依赖 `window`、`document`、`navigator` 等全局对象）
- 部分属性（如 `gpu`、`bluetooth`、`serial`）需要安全上下文（HTTPS）才有值
- `navigator.userAgentData.getHighEntropyValues()` 是异步方法，本脚本未调用
- 输出 JSON 可能较大（通常 50-200 KB），取决于页面复杂度
