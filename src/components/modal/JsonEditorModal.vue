<template>
  <MoveModal
    v-model:open="open"
    :title="t('mcp.jsonEditor')"
    width="800px"
    :footer="null"
    :bodyStyle="{ padding: 0, height: '600px' }"
  >
    <div style="height: 100%; display: flex; flex-direction: column">
      <div style="flex: 1; overflow: hidden">
        <JsonEditor v-model:value="jsonValue">
          <template #title>
            <div style="display: flex; align-items: center; gap: 8px;">
              <a-button type="link" size="small" @click="insertStdioExample">
                stdio
              </a-button>
              <a-button type="link" size="small" @click="insertHttpsExample">
                https
              </a-button>
              <a-button type="link" size="small" @click="insertSseExample">
                sse
              </a-button>
              <a-tooltip :title="t('jsonEditor.insertExampleTip')">
                <QuestionCircleOutlined style="color: #1890ff; cursor: pointer;" />
              </a-tooltip>
            </div>
          </template>
        </JsonEditor>
      </div>
      <div
        style="
          padding: 16px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        "
      >
        <a-button @click="handleCancel" :disabled="loading">
          {{ t("common.cancel") }}
        </a-button>
        <a-button type="primary" @click="handleSave" :loading="loading">
          {{ t("common.save") }}
        </a-button>
      </div>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { QuestionCircleOutlined } from "@ant-design/icons-vue";
import JsonEditor from "@/components/jsonEditor/index.vue";
import { MoveModal } from "./index";
import { useMcp } from "@/hooks/useMcp";
import { useUserStore } from "@/store/user";
import { McpConfigItemType } from "@/types";

const { t } = useI18n();
const { addMcpConfig } = useMcp();
const userStore = useUserStore();

const open = defineModel<boolean>("open");
const emit = defineEmits<{
  refresh: []
}>();
const jsonValue = ref<string>(JSON.stringify({
  mcpServers: {},
}, null, 2));
const loading = ref(false);

const handleCancel = () => {
  open.value = false;
};

const handleSave = async () => {
  loading.value = true;
  try {
    
    // 解析 JSON 字符串
    let parsedValue;
    try {
      parsedValue = typeof jsonValue.value === 'string' 
        ? JSON.parse(jsonValue.value) 
        : jsonValue.value;
    } catch (parseError) {
      message.error(t('jsonEditor.formatError'));
      return;
    }
    
    const mcpServers = parsedValue.mcpServers;
    console.log("mcpServers", mcpServers);
    if (!mcpServers || Object.keys(mcpServers).length === 0) {
      message.warning(t('jsonEditor.noServerConfig'));
      return;
    }

    // 收集所有错误
    const errors: string[] = [];
    
    // 遍历所有 MCP 服务器配置，逐个保存
    for (const [serverKey, serverConfig] of Object.entries(mcpServers)) {
      try {
        const config = serverConfig as any;
        // 处理参数转换
        const processedConfig = {
          ...config,
          // 使用 key 作为 name，如果没有 name 字段的话
          name: config.name || serverKey,
          // 处理 args 数组转换为字符串
          params: Array.isArray(config.args) 
            ? config.args.join('\n') 
            : config.args || '',
          // 处理 headers 对象转换为字符串
          headers: typeof config.headers === 'object' 
            ? Object.entries(config.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            : config.headers || '',
          // 处理环境变量对象转换为字符串
          env: typeof config.env === 'object' 
            ? Object.entries(config.env)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n')
            : config.env || '',
          // 使用 key 作为稳定 id（兼容 serverName）
          id: config.id || serverKey,
          // 设置默认超时时间
          timeout: config.timeout || 60
        };
        if (!processedConfig.type) {
          // 如果type为空，则默认使用stdio
          processedConfig.type = McpConfigItemType.STDIO;
        }

        // 使用 hook 中的完整保存流程，确保云端和本地都保存
        await addMcpConfig(processedConfig);
      } catch (error) {
        // 收集错误，不立即抛出
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        errors.push(`"${serverKey}": ${errorMessage}`);
      }
    }

    // 如果有错误，一次性显示所有错误
    if (errors.length > 0) {
      throw new Error(t('jsonEditor.saveFailedWithErrors', { errors: errors.join('\n') }));
    }
    message.success(t('jsonEditor.saveSuccess'));
    // 清除当前数据
    jsonValue.value = JSON.stringify({
      mcpServers: {},
    }, null, 2);
    open.value = false;
    // 通知外部刷新数据
    emit('refresh');
  } catch (error) {
    console.error("保存失败:", error);
    const errorMessage = error instanceof Error ? error.message : t('jsonEditor.saveFailed');
    message.error(errorMessage);
  } finally {
    loading.value = false;
  }
};

// 插入 stdio 范例
const insertStdioExample = () => {
  // 解析当前 JSON 字符串
  let currentValue;
  try {
    currentValue = typeof jsonValue.value === 'string' 
      ? JSON.parse(jsonValue.value) 
      : jsonValue.value;
  } catch (parseError) {
    // JSON 格式错误时，提示用户而不是覆盖内容
    message.error(t('jsonEditor.formatErrorInsert'));
    return;
  }

  if (!currentValue.mcpServers) {
    currentValue.mcpServers = {};
  }

  currentValue.mcpServers["stdio-server-example"] = {
    type: "stdio",
    description: "通过标准输入输出通信的 MCP 服务器",
    command: "npx",
    args: ["server.js"],
  };

  // 重新设置 JSON 字符串
  jsonValue.value = JSON.stringify(currentValue, null, 2);
  message.success(t("jsonEditor.insertSuccess"));
};

// 插入 https 范例
const insertHttpsExample = () => {
  // 解析当前 JSON 字符串
  let currentValue;
  try {
    currentValue = typeof jsonValue.value === 'string' 
      ? JSON.parse(jsonValue.value) 
      : jsonValue.value;
  } catch (parseError) {
    // JSON 格式错误时，提示用户而不是覆盖内容
    message.error(t('jsonEditor.formatErrorInsert'));
    return;
  }

  if (!currentValue.mcpServers) {
    currentValue.mcpServers = {};
  }

  currentValue.mcpServers["https-server-example"] = {
    type: "streamableHttp",
    description: "通过 HTTPS 协议通信的 MCP 服务器",
    url: "https://api.example.com/mcp",
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 60,
  };

  // 重新设置 JSON 字符串
  jsonValue.value = JSON.stringify(currentValue, null, 2);
  message.success(t("jsonEditor.insertSuccess"));
};

// 插入 sse 范例
const insertSseExample = () => {
  // 解析当前 JSON 字符串
  let currentValue;
  try {
    currentValue = typeof jsonValue.value === 'string' 
      ? JSON.parse(jsonValue.value) 
      : jsonValue.value;
  } catch (parseError) {
    // JSON 格式错误时，提示用户而不是覆盖内容
    message.error(t('jsonEditor.formatErrorInsert'));
    return;
  }

  if (!currentValue.mcpServers) {
    currentValue.mcpServers = {};
  }

  currentValue.mcpServers["sse-server-example"] = {
    type: "sse",
    description: "通过 Server-Sent Events 通信的 MCP 服务器",
    url: "https://stream.example.com/mcp",
    headers: {
      "Content-Type": "text/event-stream",
    },
    timeout: 60,
  };

  // 重新设置 JSON 字符串
  jsonValue.value = JSON.stringify(currentValue, null, 2);
  message.success(t("jsonEditor.insertSuccess"));
};
</script>

<style scoped></style>
