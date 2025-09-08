<!-- 聊天框 -->
<template>
  <div class="box" :class="themeClass">
    <div ref="mdRef" class="box-md" @click="handleClick">
      <template v-for="(item, index) in renderedContent" :key="index">
        <component
          v-if="item.type === 'component'"
          :is="componentMap[item.componentName]"
          v-bind="item.props"
        />
        <div v-else-if="item.type === 'html'" v-html="item.content" />
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  defineProps,
  computed,
  ref,
  watch,
  h,
  watchEffect,
  nextTick,
  PropType,
  render,
  createApp,
  onMounted,
} from "vue";
import { message } from "ant-design-vue";
import { ImagePreviewer } from "./index";

// 组件映射表
const componentMap = {
  MdImagePreviewer: ImagePreviewer,
};
import ChatChart from "@/components/chatChart/Index.vue";
//引入样式
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // 选择 GitHub 清爽样式
import MarkdownIt from "markdown-it";
import mk from "@iktakahiro/markdown-it-katex";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import exportExcelSvg from "@/assets/images/export_excel.svg";
import exportChartSvg from "@/assets/images/export_chart.svg";

const mdRef = ref();
const md: MarkdownIt = new MarkdownIt({
  breaks: true,
  html: true,
  // linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    const isPython = lang && (lang.toLowerCase() === 'python' || lang.toLowerCase() === 'py');
    const runButton = isPython ? '<span class="run-click" id="run-click">运行代码</span>' : '';
    
    return `<pre class="code-container" data-lang="${lang || ''}" data-code="${encodeURIComponent(str)}">
                  <div class="copy-div">
                    <span class="copy-title">${lang || "代码"}</span>
                    <div class="code-actions">
                      <span class="copy-click" id="copy-click">复制代码</span>
                      ${runButton}
                    </div>
                  </div>
                 <code class="language-${lang} hljs">${
      lang
        ? hljs.highlight(str, { language: lang }).value
        : hljs.highlightAuto(str).value
    }</code></pre>`;
  },
});
md.use(mk, {
  throwOnError: false,
  errorColor: "#cc0000",
}); // 使用数学公式插件
// 让所有a标签都在新标签页打开，并加上安全属性
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // 添加 target="_blank" rel="noopener noreferrer"
  const aIndex = tokens[idx].attrIndex("target");
  if (aIndex < 0) {
    tokens[idx].attrPush(["target", "_blank"]);
  } else {
    tokens[idx].attrs[aIndex][1] = "_blank";
  }
  // rel
  const relIndex = tokens[idx].attrIndex("rel");
  if (relIndex < 0) {
    tokens[idx].attrPush(["rel", "noopener noreferrer"]);
  } else {
    tokens[idx].attrs[relIndex][1] = "noopener noreferrer";
  }
  return self.renderToken(tokens, idx, options);
};

// 自定义图片渲染规则，返回特殊标记
md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex("src");
  const titleIndex = token.attrIndex("title");
  const altIndex = token.attrIndex("alt");

  const src = srcIndex >= 0 ? token.attrs[srcIndex][1] : "";
  const title = titleIndex >= 0 ? token.attrs[titleIndex][1] : "";
  const alt = altIndex >= 0 ? token.attrs[altIndex][1] : title;

  // 返回特殊标记，用于后续解析
  return `<!--COMPONENT:MdImagePreviewer|${src}|${alt}|${title}|THEME_PLACEHOLDER-->`;
};

const props = defineProps({
  msg: {
    type: String,
    required: true,
    default: "",
  },
  theme: {
    type: String as PropType<'light' | 'dark'>,
    default: 'light'
  }
});

// 计算主题class名
const themeClass = computed(() => `markdown-${props.theme}`);

const msgToMd = computed(() => {
  // 做数学公式替换
  const msg = props.msg
    .replace(/\\\(\s?|\s?\\\)/g, "$") // 替换 \(、\(空格、空格\) 为 $
    .replace(/\\\[\s?|\s?\\\]/g, "$$") // 替换 \[、\[空格、空格\] 为 $$
    .replace(/\\\\([a-z])/g, "\\\\$1"); // 替换 \\[a-z] 为 \\[a-z]

  return md.render(msg);
});

// 解析 Markdown 内容，将组件标记转换为组件
const renderedContent = computed(() => {
  let html = msgToMd.value;
  
  // 替换主题占位符
  html = html.replace(/THEME_PLACEHOLDER/g, props.theme || 'light');

  const parts = html.split(/(<!--COMPONENT:[^>]+-->)/);

  return parts.map((part) => {
    if (part.startsWith("<!--COMPONENT:")) {
      // 解析组件标记
      const match = part.match(
        /<!--COMPONENT:([^|]+)\|([^|]+)\|([^|]*)\|([^|]*)\|([^>]*)-->/
      );
      if (match) {
        const [, componentName, src, alt, title, theme] = match;
        return {
          type: "component",
          componentName,
          props: { src, alt, title, theme },
        };
      }
    }
    // 普通 HTML 内容
    return {
      type: "html",
      content: part,
    };
  });
});

md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
  return '<div class="table-container"><table>';
};
md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
  const download = document.createElement("div");
  download.className = "table-action";
  download.innerHTML = `
  <img src=${exportExcelSvg} class="export-excel" title="导出表格"/>
  <img src=${exportChartSvg} class="export-chart" title="生成图表"/>
  `;
  return "</table></div>" + download.outerHTML;
};
// 定义一个函数来检查值是否能转换为数值类型
function isNumeric(value) {
  return !isNaN(value) && isFinite(value);
}

import Antd from "ant-design-vue";
import { loadPyodide } from "pyodide";

// 全局Pyodide实例缓存
let pyodideInstance: any = null;

// Python代码执行函数
const runPythonCode = async (code, buttonElement) => {
  console.log('🐍 [PYTHON] 开始执行Python代码:', code);
  
  // 更新按钮状态
  const originalText = buttonElement.textContent;
  buttonElement.textContent = '运行中...';
  buttonElement.disabled = true;
  
  try {
    // 方案一：通过浏览器Pyodide运行Python（推荐用于简单代码）
    await runPythonInBrowser(code, buttonElement);
    
  } catch (error: any) {
    console.error('🐍 [PYTHON] Python代码执行失败:', error);
    
    // 显示错误消息（不在DOM显示结果）
    message.error(`Python代码执行失败: ${error?.message || '未知错误'}`);
  } finally {
    // 恢复按钮状态
    buttonElement.textContent = originalText;
    buttonElement.disabled = false;
  }
};

// 在浏览器中运行Python代码（使用Pyodide）
const runPythonInBrowser = async (code: string, buttonElement: HTMLElement) => {
  console.log('🐍 [PYTHON] 使用npm版本的Pyodide执行Python');
  
  try {
    if (!pyodideInstance) {
      message.info('正在加载Python运行环境，首次加载需要一些时间...');
    
      pyodideInstance = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/"
      });
      
      console.log('🐍 [PYTHON] Pyodide初始化完成');
    }
    
    // 执行Python代码
    console.log('🐍 [PYTHON] 执行代码:', code);
    
    const pyodide = pyodideInstance;
    
    // 重定向Python的print输出
    pyodide.runPython(`
import sys
from io import StringIO
_stdout = sys.stdout
sys.stdout = mystdout = StringIO()
    `);
    
    // 执行用户代码
    const result = pyodide.runPython(code);
    
    // 获取输出
    const capturedOutput = pyodide.runPython('mystdout.getvalue()');
    
    // 恢复标准输出
    pyodide.runPython('sys.stdout = _stdout');
    
    const output = capturedOutput || (result !== undefined ? String(result) : '代码执行完成');
    
    console.log('🐍 [PYTHON] 执行结果:', output);
    console.log('🐍 [PYTHON] 原始返回值:', result);
    
    // 显示成功消息（不在DOM显示结果）
    message.success(`Python代码执行成功，结果已输出到控制台`);
    
  } catch (error: any) {
    console.error('🐍 [PYTHON] Pyodide执行错误:', error);
    throw error;
  }
};


// Python执行结果已简化为仅控制台输出，不需要DOM显示函数

// 处理点击事件，使用事件委托来监听动态生成的元素
const handleClick = (event) => {
  // 检查点击的元素是否是我们关心的按钮
  if (event.target.classList.contains("copy-click")) {
    const codeContainer = event.target.parentNode.nextElementSibling;
    if (!codeContainer) return;
    navigator.clipboard.writeText(codeContainer.innerText);
    const appName = import.meta.env.VITE_APP_TITLE;
    message.success(`复制成功，内容由${appName}生成`);
  }
  
  // 处理Python代码运行
  if (event.target.classList.contains("run-click")) {
    const preElement = event.target.closest('.code-container');
    if (!preElement) return;
    
    const lang = preElement.dataset.lang;
    const encodedCode = preElement.dataset.code;
    
    if (!encodedCode) return;
    
    const code = decodeURIComponent(encodedCode);
    
    console.log('准备运行Python代码:', code);
    
    // 验证是否为Python代码
    if (lang && (lang.toLowerCase() === 'python' || lang.toLowerCase() === 'py')) {
      runPythonCode(code, event.target);
    }
  }
  if (event.target.classList.contains("export-excel")) {
    const tableContainer = event.target.parentNode.previousElementSibling;
    if (!tableContainer) return;
    const tableData = tableContainer.querySelector("table");
    // 解析当前表格的数据
    const headers: any[] = [];
    const rows: any[] = [];
    const headerRow = tableData.rows[0];
    headers.push(
      ...Array.from(headerRow.cells).map((cell: any) => cell.innerText)
    );
    Array.from(tableData.rows)
      .slice(1)
      .forEach((row: any) => {
        rows.push(Array.from(row.cells).map((cell: any) => cell.innerText));
      });
    const worksheet = XLSX.utils.aoa_to_sheet(
      [headers, ...rows].map((row) =>
        row.map((cell) => {
          // 检查每个单元格的值是否能转换为数值类型
          if (typeof cell === "string" && isNumeric(parseFloat(cell))) {
            // 如果能转换为数值，则返回一个包含数值和类型的对象
            return { v: parseFloat(cell), t: "n" };
          } else {
            // 否则，直接返回单元格值（默认为字符串类型）
            return cell;
          }
        })
      )
    );
    const workbook = XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    // 获取当前时间
    const now = new Date();

    // 提取年、月、日、时、分、秒
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 月份从0开始，需要加1，并且确保是两位数
    const day = String(now.getDate()).padStart(2, "0"); // 确保日期是两位数
    const hours = String(now.getHours()).padStart(2, "0"); // 确保小时是两位数
    const minutes = String(now.getMinutes()).padStart(2, "0"); // 确保分钟是两位数
    const seconds = String(now.getSeconds()).padStart(2, "0"); // 确保秒是两位数

    // 拼接成文件名
    const fileName = `data${year}${month}${day}${hours}${minutes}${seconds}`;
    saveAs(blob, `${fileName}.xlsx`);
  }
  if (event.target.classList.contains("export-chart")) {
    const actionNode = event.target.parentNode;
    if (!actionNode) return;
    // 验证actionNode的下一个节点是否为chart-container
    if (
      actionNode.nextElementSibling &&
      actionNode.nextElementSibling.classList.contains("chart-container")
    ) {
      const chartContainer = actionNode.nextElementSibling;
      chartContainer.remove();
    } else {
      // 获取到table的数据
      const tableContainer = actionNode.previousElementSibling;
      if (!tableContainer) return;
      const tableData = tableContainer.querySelector("table");
      // 解析当前表格的数据
      const headers: any[] = [];
      const rows: any[] = [];
      const headerRow = tableData.rows[0];
      headers.push(
        ...Array.from(headerRow.cells).map((cell: any) => cell.innerText)
      );
      Array.from(tableData.rows)
        .slice(1)
        .forEach((row: any) => {
          rows.push(Array.from(row.cells).map((cell: any) => cell.innerText));
        });
      // 创建一个新的 Vue 应用实例并挂载 VNode 到指定位置
      const app = createApp({
        render() {
          return h(ChatChart, {
            source: [headers, ...rows],
          });
        },
      });
      app.use(Antd);
      // 创建一个新元素
      const chartContainer = document.createElement("div");
      chartContainer.className = "chart-container";
      actionNode.insertAdjacentElement("afterend", chartContainer);
      app.mount(chartContainer);
    }
  }
};
</script>

<style>
@import "katex/dist/katex.min.css";
@import "./theme.scss";

.copy-div {
  position: absolute;
  top: 0;
  display: flex;
  width: 100%;
  background: var(--md-copy-div-bg);
  color: var(--md-copy-div-color);
  padding: 10px 20px;
  padding-left: 15px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid var(--md-copy-div-border);
}

.copy-title {
  display: inline-block;
  flex: 1;
  font-size: 16px;
  font-weight: 600;
}

.code-actions {
  display: flex;
  gap: 8px;
}

.copy-click,
.run-click {
  display: inline-block;
  text-align: right;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.copy-click:hover,
.run-click:hover {
  background-color: var(--md-copy-hover-bg);
}

.run-click {
  color: #059669;
}

.run-click:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-action {
  display: flex;
  justify-content: flex-end;
}

.export-excel {
  width: 20px;
  height: 20px;
  margin-left: 8px;
  transition: all 0.3s;
}

.export-excel:hover {
  cursor: pointer;
  opacity: 0.8;
}

.export-for {
  width: 20px;
  height: 20px;
  transition: all 0.3s;
}

.export-for:hover {
  cursor: pointer;
  opacity: 0.8;
}

.export-chart {
  height: 25px;
  margin-left: 8px;
  transition: all 0.3s;
}

.export-chart:hover {
  cursor: pointer;
  opacity: 0.8;
}
</style>
<style lang="scss" scoped>
:deep(p) {
  line-height: 1.3;
  margin: 4px 0;
}
:deep(pre) {
  border-radius: 8px;
  position: relative;
  background: var(--md-code-block-bg);
  border: 1px solid var(--md-code-block-border);
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 6px 0 !important;
  box-shadow: 0 2px 4px var(--md-code-block-shadow);
  code {
    background: var(--md-code-block-bg);
    border-radius: 0 0 8px 8px;
    overflow-x: visible;
    overflow-y: hidden;
    padding: 16px;
  }
}

:deep(code) {
  background-color: var(--md-code-inline-bg);
  border-radius: 4px;
  margin: 0;
  padding: 1px 4px;
  white-space: break-spaces;
  color: var(--md-code-inline-color);
  font-size: 0.85em;
}

:deep(caption) {
  font-size: 1em;
  margin-bottom: 4px;
}

:deep(.table-container) {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 6px 0;
}

:deep(table) {
  width: 100%; /* 表格宽度占满父容器 */
  border-collapse: separate; /* 分离单元格边框以支持圆角 */
  border-spacing: 0; /* 清除单元格间距 */
  font-size: 14px; /* 表格字体大小 */
  border-radius: 12px; /* 表格圆角 */
  overflow: hidden; /* 隐藏溢出以保持圆角效果 */
  border: 1px solid var(--md-table-border); /* 表格边框 */

  th,
  td {
    padding: 12px 16px; /* 单元格内边距 */
    text-align: left; /* 文本左对齐 */
    border-right: 1px solid var(--md-table-cell-border); /* 单元格右边框 */
    border-bottom: 1px solid var(--md-table-cell-border); /* 单元格下边框 */
    transition: all 0.2s ease; /* 添加过渡效果 */
  }

  th:last-child,
  td:last-child {
    border-right: none; /* 最后一列不显示右边框 */
  }

  th {
    word-break: break-all;
    white-space: nowrap;
    background-color: var(--md-table-header-bg); /* 淡蓝色背景 */
    color: var(--md-table-header-color); /* 表头文本颜色 */
    font-weight: 600; /* 表头文本加粗 */
    font-size: 13px; /* 表头字体稍小 */
    letter-spacing: 0.5px; /* 字母间距 */
    text-transform: uppercase; /* 大写字母 */
  }

  tbody tr:nth-child(odd) {
    background-color: var(--md-table-odd-row-bg); /* 奇数行背景色 */
  }

  tbody tr:nth-child(even) {
    background-color: var(--md-table-even-row-bg); /* 偶数行背景色 */
  }

  tbody tr:hover {
    background-color: var(--md-table-hover-bg); /* 鼠标悬停时变色 */
    box-shadow: 0 4px 8px var(--md-table-hover-shadow); /* 悬停阴影 */
  }

  tbody tr:hover td {
    color: var(--md-table-hover-color); /* 悬停时文字颜色 */
  }

  tbody tr {
    border-bottom: 1px solid var(--md-table-cell-border);
  }

  tbody tr:last-child {
    border-bottom: none; /* 最后一行不显示下边框 */
  }

  tbody tr:last-child td:first-child {
    border-bottom-left-radius: 12px; /* 左下角圆角 */
  }

  tbody tr:last-child td:last-child {
    border-bottom-right-radius: 12px; /* 右下角圆角 */
  }

  th:first-child {
    border-top-left-radius: 12px; /* 左上角圆角 */
  }

  th:last-child {
    border-top-right-radius: 12px; /* 右上角圆角 */
  }
}

// Markdown元素美化样式
:deep(hr) {
  border: none;
  height: 0.5px;
  background-color: var(--md-hr-color);
  margin: 8px 0;
}

:deep(blockquote) {
  margin: 8px 0;
  padding: 6px 10px;
  background-color: var(--md-blockquote-bg);
  border-left: 3px solid var(--md-blockquote-border);
  border-radius: 0 6px 6px 0;
  color: var(--md-blockquote-color);

  p {
    margin: 0 0 4px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }
}

:deep(h1, h2, h3, h4, h5, h6) {
  color: var(--md-heading-color);
  font-weight: 600;
  margin: 10px 0 6px 0;
  line-height: 1.2;

  &:first-child {
    margin-top: 0;
  }
}

:deep(h1) {
  font-size: 1.3em;
  border-bottom: 1px solid var(--md-heading-border);
}

:deep(h2) {
  font-size: 1.15em;
  border-bottom: 1px solid var(--md-heading-border);
}

:deep(h3) {
  font-size: 1.05em;
}

:deep(h4) {
  font-size: 1em;
}

:deep(h5) {
  font-size: 0.95em;
}

:deep(h6) {
  font-size: 0.9em;
  color: var(--md-del-color);
}

:deep(strong) {
  color: var(--md-strong-color);
  font-weight: 600;
}

:deep(em) {
  color: var(--md-em-color);
  font-style: italic;
}

:deep(del) {
  color: var(--md-del-color);
  text-decoration: line-through;
}

:deep(mark) {
  background-color: var(--md-mark-bg);
  color: var(--md-mark-color);
  padding: 0 2px;
  border-radius: 3px;
}

:deep(a) {
  color: var(--md-link-color);
  text-decoration: underline;
  text-decoration-color: var(--md-link-underline-color);
  text-underline-offset: 1px;
  transition: all 0.2s ease;

  &:hover {
    color: var(--md-link-hover-color);
    text-decoration-color: var(--md-link-hover-underline-color);
  }
}

:deep(ul),
:deep(ol) {
  // margin-top: -25px;
  margin-bottom: 0;
  padding-left: 20px;
  li {
    line-height: 1;
    color: var(--md-list-color);
    &::marker {
      color: var(--md-list-marker-color);
      font-weight: 600;
    }
    // 嵌套的ul和ol不应用-25px的margin-top
    ul,
    ol {
      margin-top: 0;
      // margin-bottom: -25px;
    }
  }
}

// 图片样式适配 - 排除表格操作图标
:deep(img:not(.export-excel):not(.export-chart):not(.export-for)) {
  // width: 100%;
  max-width: 520px;
  max-height: 520px;
  border-radius: 6px;
  margin: 6px 0;
}

:deep(.ant-image-mask) {
  display: none;
}
.box {
  width: 100%;
  overflow: hidden;

  &-md {
    color: var(--md-list-color);
    width: 100%;
    overflow: hidden;
  }
}
</style>
