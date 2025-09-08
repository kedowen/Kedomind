import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import { Base64 } from 'js-base64';
import { awaitWrapper, exportToWord } from '@/api';
import { Message, MessageRoleEnum } from '@/types';

export const useExport = () => {
  const { t } = useI18n();
  const isExporting = ref(false);

  // 生成时间戳文件名
  const generateTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  };

  // 生成带下划线的时间戳文件名
  const generateTimestampWithUnderscore = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  };

  // 生成带时间戳的文件名
  const generateTimestampFilename = (prefix: string, extension: string): string => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    return `${prefix}_${timestamp}.${extension}`;
  };

  // 下载文件
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 将聊天记录转换为纯文本格式
  const convertChatToText = (chatList: Message[]): string => {
    if (!chatList || chatList.length === 0) {
      return '';
    }

    return chatList.map(message => {
      if (message.type === MessageRoleEnum.USER) {
        return `用户: ${message.content}`;
      } else if (message.type === MessageRoleEnum.AI) {
        const content = message.content[message.currentIndex]?.contentList || [];
        const textContent = content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.content)
          .join('\n\n');
        return `AI助手: ${textContent}`;
      }
      return '';
    }).join('\n\n---\n\n');
  };

  // 将聊天记录转换为JSON字符串
  const convertChatToJson = (chatList: Message[]): string => {
    if (!chatList || chatList.length === 0) {
      return '';
    }
    return JSON.stringify(chatList, null, 2);
  };

  // 1. 导出文本为TXT文件
  const exportTextAsTxt = async (content: string, filename?: string) => {
    try {
      if (!content || !content.trim()) {
        message.warning("没有可导出的文本内容");
        return;
      }

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const timestamp = generateTimestampWithUnderscore();
      const finalFilename = filename || `export_${timestamp}.txt`;
      
      downloadFile(url, finalFilename);
      URL.revokeObjectURL(url);
      
      message.success("导出TXT成功");
    } catch (error) {
      console.error("导出TXT失败:", error);
      message.error("导出失败");
    }
  };

  // 2. 导出内容为Word
  const exportAsWord = async (content: string, customTitle?: string) => {
    if (!content) {
      message.warning("没有可导出的内容");
      return;
    }

    isExporting.value = true;
    const hideLoading = message.loading(t("common.exporting"), 0);

    try {
      const html = new MarkdownIt().render(content);
      const base64HtmlContent = await Base64.encode(html);
      const timestamp = generateTimestamp();
      const title = customTitle || timestamp;

      const [err, res] = await awaitWrapper(
        exportToWord({
          htmlContent: base64HtmlContent,
          title: title,
        })
      );

      if (err || !res.data) {
        message.error("导出Word失败");
        return;
      }

      downloadFile(res.data, "");
      message.success("导出Word成功");
    } catch (error) {
      console.error("导出Word失败:", error);
      message.error("导出失败");
    } finally {
      hideLoading();
      isExporting.value = false;
    }
  };

  // 3. 导出聊天记录为TXT
  const exportChatAsTxt = async (chatList: Message[]) => {
    if (!chatList || chatList.length === 0) {
      message.warning(t("common.noShareableConversation") || "暂无可导出的聊天记录");
      return;
    }
    const content = convertChatToJson(chatList);
    const filename = generateTimestampFilename("chat", "txt");
    await exportTextAsTxt(content, filename);
  };

  // 4. 导出聊天记录为Word
  const exportChatAsWord = async (chatList: Message[]) => {
    if (!chatList || chatList.length === 0) {
      message.warning(t("common.noShareableConversation") || "暂无可导出的聊天记录");
      return;
    }
    const chatContent = convertChatToText(chatList);
    await exportAsWord(chatContent);
  };

  return {
    isExporting,
    exportTextAsTxt,
    exportAsWord,
    exportChatAsTxt,
    exportChatAsWord,
    convertChatToText,
    convertChatToJson,
    generateTimestamp,
    generateTimestampWithUnderscore,
    generateTimestampFilename,
  };
};
