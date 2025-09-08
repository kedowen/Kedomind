import moment from "moment";
import { Base64 } from "js-base64";
import { useUserStore } from "@/store";
import { awaitWrapper, createChat, getChatList, queryChatHistory, removeChatHistory, updateChat, RemoveAllChat, deleteChat, saveChatHistory, updateChatHistory } from "@/api";
import { Message, MessageRoleEnum, AIMessage } from "@/types";
import { chatRecordLocal } from "@/local/chatRecordLocal";

export const useHistory = () => {
  const userStore = useUserStore();
  const getFormateLibraryTime = (time: string) => {
    return moment(time).format("YYYY-MM-DD HH:mm:ss");
  };

  const actCreateChat = async ({ title }) => {
    const [err, res] = await awaitWrapper(
      createChat({
        userId: userStore.getUserId,
        caption: title,
        platformId: "kedomind",
        agentId: "",
        createdByAgent: 0,
      })
    );
    if (res && res.data) {
      try {
        const [localErr, localRes] = await chatRecordLocal.createChat({
          userId: String(userStore.getUserId),
          title: title,
          id: res.data
        });
        if (!localErr && localRes) {
          console.log('本地存储成功', localRes);
        }
      } catch (localErr) {
        console.warn('本地存储失败，尝试远程API:', localErr);
      }
      return [null, res.data];
    } else {
      return [err, null];
    }
  };
  const actGetChatList = async ({ pageIndex, pageSize, keyword }: { pageIndex: number; pageSize: number; keyword?: string }) => {
    // 本地为先：优先返回本地数据；本地出错时再请求云端
    try {
      const [localErr, localRes] = await chatRecordLocal.getChatList({
        userId: String(userStore.getUserId),
        pageIndex: pageIndex,
        pageSize: pageSize,
        keyword,
      });
      if (!localErr && localRes) {
        const formattedItems = localRes.items.map((item) => ({
          f_Id: item.id,
          f_Caption: item.title,
          f_CreateDate: item.createTime,
          f_UpdateDate: item.updateTime,
        }));
        return [null, { items: formattedItems, total: localRes.total }];
      }
    } catch (localErr) {
      console.warn("本地读取会话列表失败，回退到云端:", localErr);
    }

    // 本地失败则请求云端
    const [err, res] = await awaitWrapper(
      getChatList({
        userId: userStore.getUserId,
        rowIndex: pageIndex,
        pageSize: pageSize,
        platformId: "kedomind",
        keyWord: keyword,
      })
    );
    if (res && res.data) {
      return [null, res.data];
    }
    return [err, null];
  };

  const actQueryChatHistory = async ({ pageIndex, pageSize, chatId }): Promise<[Error | null, { items: Message[] } | null]> => {
    // 本地优先
    try {
      const [localErr, localRes] = await chatRecordLocal.getChatHistory({
        userId: String(userStore.getUserId),
        chatId,
        pageIndex,
        pageSize,
      });
      if (!localErr && localRes) {
        const mappedLocalItems = localRes.items.map((item) => {
          try {
            const decodedContent = Base64.decode(item.contentData || '');
            const parsedData = JSON.parse(decodedContent);
            switch (item.roleType) {
              case MessageRoleEnum.USER:
                return {
                  id: item.id,
                  type: item.roleType,
                  content: parsedData || '',
                  time: item.createTime,
                } as Message;
              case MessageRoleEnum.AI:
                // 兼容老版本的 contentList 数据结构
                let aiContent;
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                  // 检查是否是老版本的 contentList 结构
                  if (Array.isArray(parsedData[0])) {
                    // 老版本：contentList 是二维数组
                    aiContent = parsedData.map((contentList, index) => ({
                      tokenUsage: 0, // 老版本没有 tokenUsage，默认为 0
                      contentList: contentList || []
                    }));
                  } else {
                    // 新版本：content 是对象数组
                    aiContent = parsedData;
                  }
                } else {
                  // 默认结构
                  aiContent = [{ tokenUsage: 0, contentList: [] }];
                }
                
                return {
                  id: item.id,
                  type: item.roleType,
                  currentIndex: 0,
                  content: aiContent,
                  isStreaming: false,
                  time: item.createTime,
                } as AIMessage;
            }
          } catch (parseError) {
            console.error('解析本地历史记录项失败:', parseError, item);
            return {
              id: item.id,
              type: item.roleType === 'user' ? 'user' : 'ai',
              time: item.createTime,
              content: item.roleType === 'user' ? '' : [{ tokenUsage: 0, contentList: [] }],
              currentIndex: 0,
              isStreaming: false,
            } as unknown as Message;
          }
        });
        mappedLocalItems.sort((a, b) => new Date((a as any).time).getTime() - new Date((b as any).time).getTime());
        return [null, { items: mappedLocalItems, total: (localRes as any).total } as any];
      }
    } catch (localErr) {
      console.warn('本地读取消息历史失败，回退到云端:', localErr);
    }

    // 回退到云端
    const [err, res] = await awaitWrapper(
      queryChatHistory({
        pageIndex: pageIndex,
        pageSize: pageSize,
        chatId: chatId,
      })
    );
    if (res && res.data && res.data.items) {
      const mappedItems = res.data.items.map(item => {
        try {
          const decodedContent = Base64.decode(item.content || '');
          const parsedData = JSON.parse(decodedContent);
          switch (item.f_RoleType) {
            case MessageRoleEnum.USER:
              return {
                id: item.f_Id,
                type: item.f_RoleType,
                content: parsedData || '',
                time: item.f_CreateDate,
              } as Message;
            case MessageRoleEnum.AI:
              // 兼容老版本的 contentList 数据结构
              let aiContent;
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                // 检查是否是老版本的 contentList 结构
                if (Array.isArray(parsedData[0])) {
                  // 老版本：contentList 是二维数组
                  aiContent = parsedData.map((contentList, index) => ({
                    tokenUsage: 0, // 老版本没有 tokenUsage，默认为 0
                    contentList: contentList || []
                  }));
                } else {
                  // 新版本：content 是对象数组
                  aiContent = parsedData;
                }
              } else {
                // 默认结构
                aiContent = [{ tokenUsage: 0, contentList: [] }];
              }  
              return {
                id: item.f_Id,
                type: item.f_RoleType,
                currentIndex: 0,
                content: aiContent,
                isStreaming: false,
                time: item.f_CreateDate,
              } as AIMessage;
          }
        } catch (parseError) {
          console.error('解析历史记录项失败:', parseError, item);
          return {
            id: item.f_Id,
            type: item.f_RoleType === 'user' ? 'user' : 'ai',
            time: item.f_CreateDate,
            content: '',
            currentIndex: 0,
            contentList: [],
            isStreaming: false,
          } as unknown as Message;
        }
      });

      // 将云端结果同步到本地（尽力而为）
      try {
        const cloudItemsForSync = (res.data.items || res.data.list || []).map((it: any) => ({
          f_Id: it.f_Id,
          f_RoleType: it.f_RoleType,
          content: it.content,
          f_CreateDate: it.f_CreateDate,
          f_UpdateDate: it.f_UpdateDate,
        }));
        await chatRecordLocal.upsertMessagesFromCloud({
          userId: String(userStore.getUserId),
          chatId,
          cloudItems: cloudItemsForSync,
        });
      } catch (syncErr) {
        console.warn('同步云端消息到本地失败:', syncErr);
      }

      mappedItems.sort((a, b) => new Date((a as any).time).getTime() - new Date((b as any).time).getTime());
      return [null, { ...res.data, items: mappedItems }];
    }
    return [err, null];
  };

  const actRemoveChatHistory = async ({ chatId }) => {
    // 这里的 chatId 实际为消息ID
    // 本地优先删除
    try {
      const [localErr, localOk] = await chatRecordLocal.deleteMessage({
        id: chatId,
        userId: String(userStore.getUserId),
      });
      if (!localErr && localOk) {
        try {
          await awaitWrapper(
            removeChatHistory({
              chatContentId: chatId,
              userId: userStore.getUserId,
            })
          );
        } catch (remoteErr) {
          console.warn('远程删除消息失败，但本地已删除:', remoteErr);
        }
        return [null, true];
      }
    } catch (localErr) {
      console.warn('本地删除消息失败，尝试远程API:', localErr);
    }

    // 本地失败，回退远程
    const [err, res] = await awaitWrapper(
      removeChatHistory({
        chatContentId: chatId,
        userId: userStore.getUserId,
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  const actUpdateChat = async ({ chatId, title }) => {
    // 优先使用本地存储
    try {
      const [localErr, localRes] = await chatRecordLocal.updateChat({
        userId: String(userStore.getUserId),
        chatId: chatId,
        title: title,
      });

      if (!localErr && localRes) {
        // 本地存储成功，同时尝试同步到远程
        try {
          await awaitWrapper(
            updateChat({
              userId: userStore.getUserId,
              chatId: chatId,
              caption: title,
            })
          );
        } catch (remoteErr) {
          console.warn('远程同步失败，但本地已更新:', remoteErr);
        }

        // 返回本地数据，格式化为与远程API一致
        return [null, localRes.id];
      }
    } catch (localErr) {
      console.warn('本地存储更新失败，尝试远程API:', localErr);
    }

    // 本地存储失败，回退到远程API
    const [err, res] = await awaitWrapper(
      updateChat({
        userId: userStore.getUserId,
        chatId: chatId,
        caption: title,
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  const actRemoveAllChat = async () => {
    // 优先使用本地存储
    try {
      const [localErr, localRes] = await chatRecordLocal.removeAllChat(String(userStore.getUserId));

      if (!localErr && localRes) {
        // 本地删除成功，同时尝试同步到远程
        try {
          await awaitWrapper(
            RemoveAllChat({
              userId: userStore.getUserId,
            })
          );
        } catch (remoteErr) {
          console.warn('远程同步失败，但本地已清空:', remoteErr);
        }

        return [null, true];
      }
    } catch (localErr) {
      console.warn('本地存储清空失败，尝试远程API:', localErr);
    }

    // 本地存储失败，回退到远程API
    const [err, res] = await awaitWrapper(
      RemoveAllChat({
        userId: userStore.getUserId,
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  const actDeleteChat = async ({ chatId }) => {
    // 优先使用本地存储
    try {
      const [localErr, localRes] = await chatRecordLocal.deleteChat({
        chatId: chatId,
        userId: String(userStore.getUserId),
      });

      if (!localErr && localRes) {
        // 本地删除成功，同时尝试同步到远程
        try {
          await awaitWrapper(
            deleteChat({
              chatId: chatId,
              userId: userStore.getUserId,
            })
          );
        } catch (remoteErr) {
          console.warn('远程同步失败，但本地已删除:', remoteErr);
        }

        return [null, true];
      }
    } catch (localErr) {
      console.warn('本地存储删除失败，尝试远程API:', localErr);
    }

    // 本地存储失败，回退到远程API
    const [err, res] = await awaitWrapper(
      deleteChat({
        chatId: chatId,
        userId: userStore.getUserId,
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  const actSaveChatHistory = async ({ chatId, roleType, content, tokenUsage = 0 }) => {
    // 本地优先：先写本地消息
    const contentData = Base64.encode(JSON.stringify(content || []));
    let localId: string | null = null;
    try {
      const [localErr, localRes] = await chatRecordLocal.saveMessage({
        userId: String(userStore.getUserId),
        chatId,
        roleType,
        contentData,
      });
      if (!localErr && localRes) {
        localId = localRes.id;
        try {
          const [err, res] = await awaitWrapper(
            saveChatHistory({
              chatId: chatId,
              roleType: roleType,
              contentData: contentData,
              chatSource: '',
              isStop: 0,
              consumedTokens: tokenUsage || 0,
              userId: userStore.getUserId,
              channelType: 'chat',
            })
          );
          if (res && res.data) {
            // 远程返回ID，用远程ID替换本地ID
            await chatRecordLocal.replaceMessageId({
              oldId: localId,
              newId: res.data,
              userId: String(userStore.getUserId),
            });
            return [null, res.data];
          }
        } catch (remoteErr) {
          console.warn('远程保存消息失败，但本地已保存:', remoteErr);
        }
        // 远程失败，返回本地ID
        return [null, localId];
      }
    } catch (localErr) {
      console.warn('本地保存消息失败，尝试远程API:', localErr);
    }

    // 本地失败，回退远程
    const [err, res] = await awaitWrapper(
      saveChatHistory({
        chatId: chatId,
        roleType: roleType,
        contentData: contentData,
        chatSource: '',
        isStop: 0,
        consumedTokens: tokenUsage || 0,
        userId: userStore.getUserId,
        channelType: 'chat',
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  const actUpdateChatHistory = async ({ id, chatId, roleType, content, tokenUsage = 0 }) => {
    // 本地优先更新
    const contentData = Base64.encode(JSON.stringify(content || []));
    try {
      const [localErr, localOk] = await chatRecordLocal.updateMessage({
        id,
        userId: String(userStore.getUserId),
        chatId,
        roleType,
        contentData,
      });
      if (!localErr && localOk) {
        try {
          await awaitWrapper(
            updateChatHistory({
              f_Id: id,
              chatId: chatId,
              roleType: roleType,
              contentData: contentData,
              chatSource: '',
              consumedTokens: tokenUsage || 0,
              userId: userStore.getUserId,
              channelType: 'chat',
            })
          );
        } catch (remoteErr) {
          console.warn('远程更新消息失败，但本地已更新:', remoteErr);
        }
        return [null, true];
      }
    } catch (localErr) {
      console.warn('本地更新消息失败，尝试远程API:', localErr);
    }

    // 本地失败，回退远程
    const [err, res] = await awaitWrapper(
      updateChatHistory({
        f_Id: id,
        chatId: chatId,
        roleType: roleType,
        contentData: contentData,
        chatSource: '',
        consumedTokens: tokenUsage || 0,
        userId: userStore.getUserId,
        channelType: 'chat',
      })
    );
    if (res && res.data) {
      return [null, res.data];
    } else {
      return [err, null];
    }
  };

  return {
    actCreateChat,
    actGetChatList,
    getFormateLibraryTime,
    actQueryChatHistory,
    actRemoveChatHistory,
    actUpdateChat,
    actRemoveAllChat,
    actDeleteChat,
    actSaveChatHistory,
    actUpdateChatHistory,
  };
};

