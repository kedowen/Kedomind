<template>
  <a-dropdown
    :trigger="['contextmenu']"
    placement="bottomLeft"
  >
    <div class="chat-record-item" :class="{ active: isActive, editing: isEditing }">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="edit-mode" @click.stop>
        <a-input
          v-model:value="editTitle"
          size="small"
          @pressEnter="confirmEdit"
          @blur="confirmEdit"
          @keydown.esc="cancelEdit"
          ref="editInput"
        />
      </div>
      <!-- 正常模式 -->
      <div v-else class="normal-mode" @click="handleClick">
        <div class="chat-info">
          <div class="chat-title" :title="chat.title">{{ chat.title || t('conversation.noConversationRecord') }}</div>
          <!-- 处理中状态指示器 -->
          <div 
            v-if="isProcessing" 
            class="processing-indicator"
            :title="t('conversation.processingIndicator')"
          >
            <div class="processing-dot"></div>
            <span class="processing-text">{{ t('conversation.processing') }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <template #overlay>
      <a-menu @click="handleMenuClick">
        <a-menu-item key="edit">
          <EditOutlined style="margin-right: 8px;" />
          <span>{{ t('common.edit') }}</span>
        </a-menu-item>
        <a-menu-divider />
        <a-menu-item key="delete" danger>
          <DeleteOutlined style="margin-right: 8px;" />
          <span>{{ t('common.delete') }}</span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, nextTick, computed } from 'vue';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { ChatRecordItem } from '@/types/history';
import { useHistory } from '@/hooks';
import { useI18n } from 'vue-i18n';
import { useConversationStore } from '@/store';

const props = defineProps<{
  chat: ChatRecordItem; 
  isActive?: boolean;
}>();

const emit = defineEmits<{
  click: [chat: ChatRecordItem];
  refresh: [];
}>();

const { actDeleteChat, actUpdateChat } = useHistory();
const { t } = useI18n();
const conversationStore = useConversationStore();

const editInput = ref();
const editTitle = ref('');
const isEditing = ref(false);
const isDeleting = ref(false);

// 计算当前会话是否正在处理中
const isProcessing = computed(() => {
  return conversationStore.isConversationProcessing(props.chat.id);
});

const handleClick = () => {
  if (!isEditing.value) {
    emit('click', props.chat);
  }
};

const handleEdit = () => {
  if (isEditing.value) {
    // 结束编辑模式
    isEditing.value = false;
  } else {
    // 开始编辑模式
    editTitle.value = props.chat.title;
    isEditing.value = true;
    nextTick(() => {
      if (editInput.value) {
        editInput.value.focus();
        editInput.value.select();
      }
    });
  }
};

const confirmEdit = async () => {
  // 防止按下回车触发 pressEnter 后又触发 blur 导致重复提交
  if (!isEditing.value) return;

  const newTitle = editTitle.value.trim();
  // 先结束编辑状态，避免随后触发的 blur 再次进入
  isEditing.value = false;

  if (newTitle && newTitle !== props.chat.title) {
    try {
      const [err] = await actUpdateChat({
        chatId: props.chat.id,
        title: newTitle
      });

      if (!err) {
        message.success(t('conversation.updateConversationTitle'));
        emit('refresh');
      } else {
        message.error(t('common.operationFailed'));
      }
    } catch (error) {
      console.error('更新会话标题失败:', error);
      message.error(t('common.operationFailed'));
    }
  }
};
const cancelEdit = () => {
  editTitle.value = props.chat.title;
  isEditing.value = false;
};

const handleDelete = async () => {
  if (isDeleting.value) return;

  isDeleting.value = true;
  try {
    const [err] = await actDeleteChat({
      chatId: props.chat.id
    });
    
    if (!err) {
      message.success(t('conversation.deleteConversationSuccess'));
      emit('refresh');
    } else {
      message.error(t('conversation.deleteConversationFailed'));
    }
  } catch (error) {
    console.error('删除会话失败:', error);
    message.error(t('conversation.deleteConversationFailed'));
  } finally {
    isDeleting.value = false;
  }
};

// 右键菜单处理
const handleMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'edit':
      handleEdit();
      break;
    case 'delete':
      // 显示删除确认对话框
      Modal.confirm({
        title: t('conversation.deleteConversation'),
        content: t('conversation.deleteCurrentConversation', [props.chat.title || t('conversation.noConversationRecord')]),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: handleDelete
      });
      break;
  }
};
</script>

<style scoped lang="scss">
.chat-record-item {
  margin-bottom: 8px;
  border-radius: 8px;
  background-color: $main-bg;
  border: 1px solid $border-color;
  transition: all 0.3s ease;
  color: $text-color;
  
  &:hover:not(.editing) {
    border-color: $primary-color;
    color: $primary-color;
  }
  
  &.active {
    background-color: $primary-bg;
    border: 1px solid $primary-color;
  }
  
  &.editing {
    border-color: $primary-color;
    box-shadow: 0 0 0 2px $shadow-color;
  }
  
  .edit-mode {
    padding: 8px 12px;
    
    .ant-input {
      border: none;
      box-shadow: none;
      padding: 4px 8px;
      
      &:focus {
        border: none;
        box-shadow: none;
      }
    }
  }
  
  .normal-mode {
    display: flex;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    
    .chat-info {
      flex: 1;
      min-width: 0;
      
      .chat-title {
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .processing-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        
        .processing-dot {
          width: 8px;
          height: 8px;
          background-color: #52c41a;
          border-radius: 50%;
          animation: processingPulse 1.5s ease-in-out infinite;
        }
        
        .processing-text {
          font-size: 12px;
          color: #52c41a;
          font-weight: 500;
        }
      }
    }
  }
}

// 处理状态指示器动画
@keyframes processingPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}
</style> 