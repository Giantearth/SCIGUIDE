# Obsidian 标注模板规范

这份文档用于规范 `DATABASE` 里的 Markdown 内容，让网页可以更准确地把“输入条件”和“数据库内容”对应起来。

目标：

- 让网页能按病因、具体类型、节段、职业、病程、AIS 精确筛选
- 保持你在 Obsidian 里的编辑体验，不强迫你立刻把所有内容拆成很多文件
- 先支持“大文档里的分段标注”，后续也可以平滑升级成“一个条目一个文件”

---

## 1. 总体原则

推荐做法：

1. 一个“可筛选内容段”对应一个独立小节
2. 每个小节前面放一段固定格式的 `%%META ... %%`
3. 正文继续正常写 Obsidian Markdown

不推荐做法：

- 只写普通 `#标签`
- 只在正文里自然语言描述“适用于颈段/肿瘤性”
- 同一段里混合多个病因和节段，但没有结构化标记

---

## 2. 推荐结构

每个可筛选段落都这样写：

```md
## 小节标题

%%META
id: 唯一ID
module: redflags
displayGroup: redflags
etiologies: traumatic
subtypes: all
segments_exact: all
segment_ranges: all
stages: all
professions: all
ais: all
priority: critical
sources: 中国2025,德国2025
summary: 一句话摘要
%%

正文内容……
```

说明：

- `## 小节标题` 是给人看的
- `%%META ... %%` 是给网页解析的
- 正文可以继续用 Obsidian 的引用块、双链、Callout、列表等语法

---

## 3. 字段总表

每个字段的作用如下。

### `id`

要求：

- 全库唯一
- 只用英文、小写、数字、连字符

示例：

```txt
rf-neoplastic-fragility
rf-cervical-respiratory
goal-pt-acute-c5
```

### `module`

表示内容的大类。

建议值：

```txt
redflags
stage
goals
focus
expectation
complication
function
other
```

### `displayGroup`

表示网页展示时归到哪个模块。

建议值：

```txt
redflags
stage
goals
focus
expectation
complication
function
other
```

通常 `module` 和 `displayGroup` 可以一致。

### `etiologies`

病因大类。

允许值：

```txt
traumatic
nontraumatic
all
```

可写多个，用英文逗号分隔。

示例：

```txt
etiologies: traumatic
etiologies: nontraumatic
etiologies: traumatic,nontraumatic
etiologies: all
```

### `subtypes`

非创伤性细分类型。

允许值：

```txt
ischemic
neoplastic
other_nontraumatic
all
```

规则：

- 如果内容只属于创伤性，通常写 `all`
- 如果内容属于非创伤性里的某个子类，要明确写出

示例：

```txt
subtypes: ischemic
subtypes: neoplastic
subtypes: other_nontraumatic
subtypes: ischemic,neoplastic
subtypes: all
```

### `segments_exact`

适用于某个或某几个具体节段。

允许值示例：

```txt
C1
C2
C5
T6
L1
S4
all
none
```

多个节段写法：

```txt
segments_exact: C5,C6,C7
segments_exact: T6
segments_exact: none
segments_exact: all
```

建议：

- 只适用于某一个明确节段时，用 `segments_exact`
- 如果是范围内容，用 `segment_ranges`

### `segment_ranges`

适用于连续节段范围。

推荐格式：

```txt
C1-T1
C1-C4
C5-C7
T2-T12
L1-S5
all
none
```

多个范围写法：

```txt
segment_ranges: C1-T1
segment_ranges: C1-C4,T2-T6
segment_ranges: none
segment_ranges: all
```

重要说明：

- 后续程序可以把 `C1-T1` 自动理解成具体节段集合
- 所以你不需要额外做一个文件解释 `C1-T1` 的含义
- 但全库格式必须统一，不能混写成 `C1~T1`、`C1至T1`、`颈高位`

### `stages`

病程阶段。

允许值：

```txt
hyperacute
acute
rehab
all
```

建议对应：

- `hyperacute` = 72h 内
- `acute` = 14 天内
- `rehab` = 14 天以上

### `professions`

职业分类。

允许值：

```txt
PT
OT
ST
RESP
all
```

### `ais`

AIS / ASIA 分级。

允许值：

```txt
A
B
C
D
E
all
```

可多选：

```txt
ais: A,B,C
ais: D,E
ais: all
```

### `priority`

内容优先级。

建议值：

```txt
critical
normal
```

通常：

- 红旗征用 `critical`
- 普通康复建议用 `normal`

### `sources`

来源名称。

示例：

```txt
sources: 中国2025,德国2025,日本2021,美国PVA
```

### `summary`

一句话摘要，用于网页列表预览。

示例：

```txt
summary: 肿瘤浸润导致脊柱脆弱，治疗前需排除病理性骨折风险。
```

---

## 4. 允许值速查表

为了保证后续网页好解析，建议全库统一使用下列值。

### 病因

```txt
traumatic
nontraumatic
all
```

### 非创伤性子类

```txt
ischemic
neoplastic
other_nontraumatic
all
```

### 节段精确值

```txt
C1,C2,C3,C4,C5,C6,C7,C8
T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12
L1,L2,L3,L4,L5
S1,S2,S3,S4,S5
all
none
```

### 节段范围

```txt
C1-T1
C1-C4
C5-C8
T2-T6
T2-T12
L1-S5
all
none
```

### 病程

```txt
hyperacute
acute
rehab
all
```

### 职业

```txt
PT
OT
ST
RESP
all
```

### AIS

```txt
A
B
C
D
E
all
```

---

## 5. 最小可复制模板

这是最常用的模板。

```md
## 标题

%%META
id: your-id
module: redflags
displayGroup: redflags
etiologies: all
subtypes: all
segments_exact: all
segment_ranges: all
stages: all
professions: all
ais: all
priority: normal
sources: 中国2025
summary: 一句话摘要
%%

正文内容……
```

---

## 6. 示例一：创伤性红旗征

```md
## 创伤性 (TSCI) 的机械稳定性红旗

%%META
id: rf-tsci-mechanical-instability
module: redflags
displayGroup: redflags
etiologies: traumatic
subtypes: all
segments_exact: all
segment_ranges: all
stages: all
professions: all
ais: all
priority: critical
sources: 中国2025,美国PVA
summary: 未固定前应避免增加脊柱负荷的康复动作。
%%

> [!CAUTION]
> ## 创伤性 (TSCI) 的机械稳定性红旗
> Related: [[创伤性脊髓损伤 (TSCI)]]
>
> - **SLIC/TLICS 评分**：若评分 ≥ 5 分，在未进行内固定手术前，严禁进行任何导致脊柱负荷增加的康复动作。
> - **二次伤预防**：搬运时必须执行“原木翻身”。
```

---

## 7. 示例二：非创伤性-肿瘤性红旗征

```md
## 肿瘤性 SCI 的脆性骨折红旗

%%META
id: rf-neoplastic-fragility
module: redflags
displayGroup: redflags
etiologies: nontraumatic
subtypes: neoplastic
segments_exact: none
segment_ranges: all
stages: all
professions: all
ais: all
priority: critical
sources: 中国2025,德国2025
summary: 肿瘤浸润导致脊柱脆弱，需避免高强度训练和剧烈牵伸。
%%

> [!DANGER]
> ## 肿瘤性 SCI 的脆性骨折红旗
> Related: [[非创伤性脊髓损伤 (NTSCI)]]
>
> - **病理性骨折**：肿瘤浸润后椎体或长骨脆弱。
> - **禁忌**：严禁高强度抗阻训练或剧烈被动牵伸。
```

---

## 8. 示例三：颈段专属红旗征

```md
## 颈段损伤的呼吸风险红旗

%%META
id: rf-cervical-respiratory
module: redflags
displayGroup: redflags
etiologies: all
subtypes: all
segments_exact: none
segment_ranges: C1-T1
stages: all
professions: PT,RESP
ais: all
priority: critical
sources: 中国2025,日本2021
summary: 颈段损伤训练前需优先评估呼吸储备、误吸和疲劳风险。
%%

> [!CAUTION]
> ## 颈段损伤的呼吸风险红旗
>
> - 训练前应优先评估呼吸储备。
> - 注意误吸、呼吸疲劳和分泌物清除能力。
```

---

## 9. 示例四：具体节段内容

```md
## C5 节段的上肢代偿训练重点

%%META
id: func-c5-upper-limb
module: function
displayGroup: function
etiologies: all
subtypes: all
segments_exact: C5
segment_ranges: none
stages: rehab
professions: PT,OT
ais: all
priority: normal
sources: 中国2025
summary: C5 节段重点围绕肘屈和基础上肢代偿展开训练。
%%

正文内容……
```

---

## 10. 示例五：职业专属内容

```md
## PT 在急性期的处理重点

%%META
id: goal-pt-acute-general
module: goals
displayGroup: goals
etiologies: all
subtypes: all
segments_exact: none
segment_ranges: all
stages: acute
professions: PT
ais: all
priority: normal
sources: 中国2025,美国PVA
summary: PT 在急性期优先处理体位、并发症预防和早期活动。
%%

正文内容……
```

---

## 11. 示例六：你未来想要的精确组合

如果你想表达：

- 非创伤性
- 肿瘤性
- 颈段 C1-C7
- 康复期
- PT / OT

就这样写：

```md
## 肿瘤性颈段患者康复训练红旗

%%META
id: rf-neoplastic-cervical-rehab
module: redflags
displayGroup: redflags
etiologies: nontraumatic
subtypes: neoplastic
segments_exact: none
segment_ranges: C1-C7
stages: rehab
professions: PT,OT
ais: all
priority: critical
sources: 中国2025,德国2025
summary: 肿瘤性颈段患者训练前需先排除不稳、病理性骨折与疲劳风险。
%%

正文内容……
```

---

## 12. 如何在 Obsidian 里高效整理

推荐步骤：

1. 先不改所有旧文档，只从最关键模块开始
2. 优先整理 `redflags`
3. 再整理和节段最相关的内容
4. 最后再补职业、AIS、病程

建议优先级：

1. 红旗征
2. 节段专属内容
3. 病因专属内容
4. 职业专属内容
5. AIS 专属内容

---

## 13. 建议的文件组织

如果你暂时还不想大拆文件，可以保留现在的大文档，只在文档内部这样分段标注。

如果后面想升级，建议逐步变成这种目录结构：

```txt
DATABASE/
  redflags/
  segments/
  goals/
  complications/
  professions/
```

后续每一条内容一个文件时，这套 `%%META` 字段仍然可以继续沿用。

---

## 14. 当前最重要的统一规则

请尽量始终遵守：

1. 所有可筛选内容段都加 `%%META`
2. `id` 必须唯一
3. 节段范围统一写成 `C1-T1` 这种格式
4. 多个值用英文逗号分隔，不要混用中文逗号
5. `all` 和 `none` 只用这两个单词，不要写“全部”“无”
6. 不要依赖普通 `#标签` 作为筛选依据

---

## 15. 你现在可以直接复制的空白模板

```md
## 标题

%%META
id: 
module: 
displayGroup: 
etiologies: all
subtypes: all
segments_exact: none
segment_ranges: all
stages: all
professions: all
ais: all
priority: normal
sources: 
summary: 
%%

正文内容……
```

---

## 16. 后续可扩展字段

如果以后你需要，还可以补这些字段：

```txt
sex:
age_group:
equipment:
setting:
contraindications:
related_docs:
```

但现阶段先不要扩太多，先把当前这套跑顺最重要。

