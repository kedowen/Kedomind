import request from '@/utils/request'

// 创建知识库
export const createLibrary = (data: any) => {
  return request.post('/knowledgebase/CreateLibrary', data)
}

// 更新知识库
export const updateLibrary = (data: any) => {
  return request.post('/knowledgebase/UpdateLibrary', data)
}

// 获取知识库列表
export const getLibraryList = (params?: any) => {
  return request.get('/knowledgebase/QueryLibraryList', { params })
}

// 获取知识库详情
export const getLibraryDetail = (params: any) => {
  return request.get('/knowledgebase/QueryLibraryDetail', { params })
}

// 删除知识库
export const deleteLibrary = (data: any) => {
  return request.post(`/knowledgebase/DeleteLibrary`, data)
}

// 批量将文档绑定到知识库
export const batchAddDocumentsToLibrary = (data: any) => {
  return request.post('/knowledgebase/BatchAddDocumentsToLibrary', data)
}

// 查询当前知识库下的所有文件
export const queryLibraryDocuments = (params: any) => {
  return request.get('/knowledgebase/QueryLibraryDocuments', { params })
}