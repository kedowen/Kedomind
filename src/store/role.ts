import { McpConfigItem } from '@/types';
import { defineStore } from 'pinia'
import { ref } from 'vue'

// 角色
export interface Role {
  // 根据时间生成即可
  id: number;
  // 角色名称
  name: string;
  // 角色内容
  prompt: string;
  // 关联的MCP，只存储MCP的id
  mcpList: string[];
  // 是否置顶
  pinned?: boolean;
}


export const useRoleStore = defineStore('role', () => {
  // 角色列表
  const rolesList = ref<Role[]>([])
  // 当前选中角色
  const selectedRole = ref<Role | null>(null)

  // 角色管理方法
  const addRole = (role: Omit<Role, 'id'>): boolean => {
    // 检查角色名称是否已存在
    const existingRole = rolesList.value.find(r => r.name === role.name)
    if (existingRole) return false
    
    const newRole: Role = {
      ...role,
      id: Date.now(), // 生成唯一 ID
      pinned: false // 默认不置顶
    }
    // 选择这个新的
    selectRole(newRole)
    
    // 找到第一个未置顶的角色位置，将新角色插入到那里
    const firstUnpinnedIndex = rolesList.value.findIndex(r => !r.pinned)
    if (firstUnpinnedIndex !== -1) {
      rolesList.value.splice(firstUnpinnedIndex, 0, newRole)
    } else {
      // 如果没有未置顶的角色，添加到列表末尾
      rolesList.value.push(newRole)
    }
    
    return true
  }

  const updateRole = (index: number, role: Role): boolean => {
    if (index < 0 || index >= rolesList.value.length) return false
    
    // 检查是否与其他角色名称冲突（排除自己）
    const existingRole = rolesList.value.find((r, i) => i !== index && r.name === role.name)
    if (existingRole) return false
    
    rolesList.value[index] = role
    
    // 如果更新的是当前选中的角色，同步更新selectedRole
    if (selectedRole.value && selectedRole.value.id === role.id) {
      selectedRole.value = role
    }
    
    return true
  }

  const removeRole = (index: number): boolean => {
    if (index < 0 || index >= rolesList.value.length) return false
    
    const role = rolesList.value[index]
    
    // 如果删除的是当前选中的角色，清空选择
    if (selectedRole.value?.name === role.name) {
      selectedRole.value = null
    }
    
    rolesList.value.splice(index, 1)
    return true
  }

  const selectRole = (role: Role | null) => {
    selectedRole.value = role
  }

  const getRoleByName = (name: string): Role | undefined => {
    return rolesList.value.find(r => r.name === name)
  }

  // 更新角色配置
  const updateRoleConfig = (config: Partial<Role>) => {
    if (selectedRole.value) {
      selectedRole.value = {
        ...selectedRole.value,
        ...config
      }
    }
  }

  // 置顶/取消置顶角色
  const togglePinRole = (roleId: number): boolean => {
    const roleIndex = rolesList.value.findIndex(r => r.id === roleId)
    if (roleIndex === -1) return false
    
    const role = rolesList.value[roleIndex]
    const wasPinned = role.pinned
    
    // 切换置顶状态
    role.pinned = !wasPinned
    
    // 如果更新的是当前选中的角色，同步更新selectedRole
    if (selectedRole.value && selectedRole.value.id === roleId) {
      selectedRole.value.pinned = role.pinned
    }
    
    // 如果是新置顶，将角色移到列表最前面（第一个位置）
    if (!wasPinned && role.pinned) {
      const [movedRole] = rolesList.value.splice(roleIndex, 1)
      rolesList.value.unshift(movedRole)
    }
    
    // 如果是取消置顶，将角色移到未置顶区域的最前面
    if (wasPinned && !role.pinned) {
      const [movedRole] = rolesList.value.splice(roleIndex, 1)
      // 找到第一个未置顶的角色位置
      const firstUnpinnedIndex = rolesList.value.findIndex(r => !r.pinned)
      if (firstUnpinnedIndex !== -1) {
        rolesList.value.splice(firstUnpinnedIndex, 0, movedRole)
      } else {
        // 如果没有其他未置顶的角色，添加到列表末尾
        rolesList.value.push(movedRole)
      }
    }
    
    return true
  }

  // 获取排序后的角色列表（置顶的在前）
  const getSortedRolesList = () => {
    return [...rolesList.value].sort((a, b) => {
      // 置顶的角色排在前面
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // 都置顶或都不置顶，按在数组中的位置排序（前面的在前面）
      return 0
    })
  }

  return {
    // 状态
    rolesList,
    selectedRole,

    // 方法
    addRole,
    updateRole,
    removeRole,
    selectRole,
    getRoleByName,
    updateRoleConfig,
    togglePinRole,
    getSortedRolesList,
  }
}, {
  persist: {
    key: 'kedo-mind-role',
    storage: localStorage
  }
})
