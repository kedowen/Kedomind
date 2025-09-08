import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 会话状态接口
export interface ConversationState {
  id: string;
  isProcessing: boolean;
  abortController?: AbortController;
  startTime?: number;
}

export const useConversationStore = defineStore('conversation', () => {
  // 会话状态Map: conversationId -> ConversationState
  const conversations = ref<Map<string, ConversationState>>(new Map());
  
  // 获取所有正在处理的会话ID
  const processingConversations = computed(() => {
    const result: string[] = [];
    conversations.value.forEach((state, id) => {
      if (state.isProcessing) {
        result.push(id);
      }
    });
    return result;
  });
  
  // 检查指定会话是否正在处理
  const isConversationProcessing = (conversationId: string) => {
    const conversation = conversations.value.get(conversationId);
    return conversation?.isProcessing || false;
  };
  
  // 检查是否有任何会话正在处理
  const hasAnyProcessing = computed(() => {
    return processingConversations.value.length > 0;
  });
  
  // 开始处理会话
  const startProcessing = (conversationId: string, abortController?: AbortController) => {
    if (!conversationId) return;
    
    console.log(`🚀 [CONVERSATION] 开始处理会话: ${conversationId}`);
    
    conversations.value.set(conversationId, {
      id: conversationId,
      isProcessing: true,
      abortController,
      startTime: Date.now()
    });
  };
  
  // 停止处理会话
  const stopProcessing = (conversationId: string) => {
    if (!conversationId) return;
    
    const conversation = conversations.value.get(conversationId);
    if (conversation) {
      console.log(`⏹️ [CONVERSATION] 停止处理会话: ${conversationId}, 处理时长: ${Date.now() - (conversation.startTime || 0)}ms`);
      
      // 如果有AbortController，调用abort
      if (conversation.abortController) {
        conversation.abortController.abort();
      }
      
      // 更新状态
      conversation.isProcessing = false;
      conversation.abortController = undefined;
    }
  };
  
  // 中止指定会话的处理
  const abortConversation = (conversationId: string) => {
    if (!conversationId) return;
    
    const conversation = conversations.value.get(conversationId);
    if (conversation && conversation.isProcessing) {
      console.log(`🛑 [CONVERSATION] 中止会话处理: ${conversationId}`);
      
      if (conversation.abortController) {
        conversation.abortController.abort();
      }
      
      stopProcessing(conversationId);
    }
  };
  
  // 获取会话的AbortController
  const getAbortController = (conversationId: string) => {
    const conversation = conversations.value.get(conversationId);
    return conversation?.abortController;
  };
  
  // 清理会话状态（当会话被删除时调用）
  const removeConversation = (conversationId: string) => {
    if (!conversationId) return;
    
    console.log(`🗑️ [CONVERSATION] 移除会话状态: ${conversationId}`);
    
    // 先停止处理
    stopProcessing(conversationId);
    
    // 从Map中移除
    conversations.value.delete(conversationId);
  };
  
  // 清理所有会话状态
  const clearAllConversations = () => {
    console.log(`🧹 [CONVERSATION] 清理所有会话状态`);
    
    // 先停止所有正在处理的会话
    conversations.value.forEach((conversation, id) => {
      if (conversation.isProcessing) {
        stopProcessing(id);
      }
    });
    
    // 清空Map
    conversations.value.clear();
  };
  
  // 获取所有会话状态（用于调试）
  const getAllConversations = () => {
    const result: ConversationState[] = [];
    conversations.value.forEach((state) => {
      result.push({
        id: state.id,
        isProcessing: state.isProcessing,
        startTime: state.startTime
      });
    });
    return result;
  };
  
  return {
    conversations,
    processingConversations,
    hasAnyProcessing,
    isConversationProcessing,
    startProcessing,
    stopProcessing,
    abortConversation,
    getAbortController,
    removeConversation,
    clearAllConversations,
    getAllConversations
  };
});
