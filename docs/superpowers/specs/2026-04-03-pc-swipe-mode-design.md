# PC 刷卡模式 + 收藏/报错功能 设计文档

**日期：** 2026-04-03  
**状态：** 已审批，待实现

---

## 概览

为 PC 端新增 Tinder 风格的无限刷卡模式，复用现有 `SwipeMode.tsx` 组件。新增收藏（⭐）和报错（🚩）两个操作，通过键盘方向键触发，并在导航栏提供独立入口。

---

## 功能范围

### 1. 刷卡页 `/swipe`

- 新建 `site/src/pages/swipe.astro`，桌面和移动端均可访问
- 挂载现有 `SwipeMode` 组件，传入 `cards` 和 `graph`
- 在顶部导航加入 "刷卡" Tab

### 2. SwipeMode 键盘扩展

四个方向键语义：

| 按键 | 操作 | 行为 |
|------|------|------|
| `←` | 熟悉（mastered） | 推进到下一张卡片 |
| `→` | 再学（review） | 推进到下一张卡片 |
| `↑` | 收藏（star） | 切换当前卡片的 starred 状态，**不推进** |
| `↓` | 报错（report） | 切换当前卡片的 reported 状态，**不推进** |

`↑` / `↓` 为切换操作：已收藏再按 `↑` 取消收藏，已报错再按 `↓` 取消报错。

### 3. SwipeMode UI 改动

**四向指示器：**  
卡片四周各显示一个提示标签，平时低透明度，按下对应键时高亮：

```
           ↑  收藏
← 熟悉  [  卡片  ]  → 再学
           ↓  报错
```

**底部按钮栏（4 个，替换原 2 个）：**

```
[✓ 熟悉  ←]  [⭐ 收藏  ↑]  [🚩 报错  ↓]  [↻ 再学  →]
```

- 每个按钮内显示对应按键提示
- 收藏/报错按钮有激活态：已收藏时 ⭐ 填色高亮，已报错时 🚩 填色高亮
- 按钮点击与键盘等效

### 4. 数据层

**`site/src/lib/types.ts`：** `Annotation` 接口加字段：

```ts
reported: boolean;
```

**`site/src/lib/annotations.ts`：** `getAnnotation` 默认值加 `reported: false`。

### 5. 收藏页 `/starred` & 报错页 `/reported`

新建共用组件 `site/src/components/CollectionPage.tsx`，接收 `mode: "starred" | "reported"`：

- 在浏览器端读 localStorage `annotations:*`，过滤出对应卡片
- 每行显示：类型色点 + 卡片标题 + 标签，点击跳转 `/cards?card=<id>`
- 空态提示：收藏页 "还没有收藏的卡片"，报错页 "没有报错记录"
- 报错页顶部说明文字："以下卡片被标记为内容有误，供核查"

新建：
- `site/src/pages/starred.astro` — 传入 cards，挂载 `CollectionPage mode="starred"`
- `site/src/pages/reported.astro` — 传入 cards，挂载 `CollectionPage mode="reported"`

### 6. 导航更新

**桌面端 `NavLinks.tsx` 最终 Tab 顺序：**
```
卡片  图谱  刷卡  ⭐ 收藏  🚩 报错
```

**移动端 `MobileNav.tsx`：**  
加入 "刷卡" Tab，保持底栏 3 个（卡片、图谱、刷卡），收藏/报错不占移动端底栏，用户可通过 `/starred`、`/reported` URL 访问。

**`index.astro` 首页 nav：** 同步加入三个链接。

---

## 不在范围内

- 报错内容不需要填写文字说明，仅 boolean 标记
- 不需要将报错数据上报服务端
- 收藏/报错页不需要批量操作或导出功能
