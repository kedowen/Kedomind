import { BusEvents } from './index' //引入事件总线

export const CHAT_EVENTS = {
    QUERY_CHAT: 'query_chat',// 查询会话记录
    NEW_FILE_CHAT: 'new_file_chat',// 创建新的会话
    NEW_KB_CHAT: 'new_kb_chat',// 创建新的会话
}

// 卸载事件
export const offChatEvents = () => {
    for (const key in CHAT_EVENTS) {
        if (Object.prototype.hasOwnProperty.call(CHAT_EVENTS, key)) {
            const element = CHAT_EVENTS[key]
            BusEvents.off(element)
        }
    }
}
