import request from "@/utils/request";

// 查询所有会话记录(分页)
export const getChatList = (params: any) => {
  return request.get('/KdwGPT/QueryChatListPages', {params});
};

// 创建会话
export const createChat = (data: any) => {
  return request.post('/KdwGPT/CreateMyChat', data);
};

// 修改会话
export const updateChat = (data: any) => {
  return request.post('/KdwGPT/ModifyMyChat', data);
};

// 删除会话
export const deleteChat = (data: any) => {
  return request.post('/KdwGPT/RemoveMyChat', data);
};

/**
 *清空所有会话记录
 */
 export const RemoveAllChat = (data: any) => {
  return request.post("/KdwGPT/RemoveAllMyChat", data);
};


// 查询完整的会话记录
export const queryChatHistory = (params: any) => {
  return request.get(`/KdwGPT/QueryChatRecordList`, { params })
}

//保存每一次的会话记录
export const saveChatHistory = (data: any) => {
  return request.post(`/KdwGPT/SaveChatContent`, data)
}

// 修改单条记录
export const updateChatHistory = (data: any) => {
  return request.post(`/KdwGPT/ModifyChatContent`, data)
}

// 移除单条会话记录
export const removeChatHistory = (data: any) => {
  return request.post(`/KdwGPT/RemoveChatContent`, data)
}