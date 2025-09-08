import request from '@/utils/request'

/**
 * 创建MCP服务器
 */
export const createMcpServer = (data: any) => {
  return request.post('/MCPHandle/CreateMCPServer', data)
}

/**
 * 更新MCP服务器
 */
export const updateMcpServer = (data: any) => {
  return request.post('/MCPHandle/UpdateMCPServer', data)
}

/**
 * 删除MCP服务器
 */
export const deleteMcpServer = (data: { mcpServerId: string }) => {
  return request.post('/MCPHandle/DeleteMCPServer', data)
}

/**
 * 获取MCP服务器列表
 */
export const getMcpServerList = (params: any = {}) => {
  return request.get('/MCPHandle/QueryMCPServerList', { params })
}

/**
 * 获取MCP服务器详情
 */
export const getMcpServerDetails = (params: { mcpServerId: string }) => {
  return request.get('/MCPHandle/QueryMCPServerById', { params })
}

/**
 * 根据类型获取MCP服务器列表
 */
export const getMcpServerListByType = (params: { serviceType: string }) => {
  return request.get('/MCPHandle/QueryMCPServerListByType', { params })
}

/**
 * 获取MCP服务器类型列表
 */
export const getMcpServerTypeList = (params: any = {}) => {
  return request.get('/MCPHandle/MCPServerTypeList', { params })
}

/**
 * 获取MCP工具信息
 */
// export const getMcpToolInfo = (params: { urls: string,mcptype:string }) => {
//   return request.get('/MCPHandle/MCPInfo', { params })
// }

// 添加用户MCP
export const addUserMcp = (data: any) => {
  return request.post('/MCPHandle/AddUserMCPServer', data)
}

// 修改用户mcp
export const UpdateUserMcp = (data: any) => {
  return request.post('/MCPHandle/UpdateUserMCPServer', data)
}

// 移除用户MCP
export const removeUserMcp = (data: any) => {
  return request.post('/MCPHandle/DeleteUserMCPServer', data)
}

// 获取用户MCP列表
export const getUserMcpList = (params: any = {}) => {
  return request.get('/MCPHandle/QueryUserMCPServerList', { params })
}