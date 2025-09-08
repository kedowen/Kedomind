import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Provider, Model, ModelConfig } from '@/types'
// 图片资源路径
const bailianPng = new URL('@/assets/images/bailian.png', import.meta.url).href
const qianwen = new URL('@/assets/images/qianwen.png', import.meta.url).href
const deepseek = new URL('@/assets/images/deepseek.png', import.meta.url).href
const claude = new URL('@/assets/images/claude.png', import.meta.url).href

// 默认模型配置
export const getDefaultModelConfig = (): ModelConfig => ({
  temperature: {
    value: 0.7,
    enable: true,
  },
  stream: true,
  maxTokens: {
    value: 4096,
    enable: true,
  },
})


// 选中模型的接口
export interface SelectedModel {
  modelId: string;
  providerId: string;
}


export const useModelStore = defineStore('model', () => {
  // 状态
  const providers = ref<Provider[]>([
    {
      id: "bailian",
      name: "阿里云百炼",
      icon: bailianPng,
      enabled: false,
      apiKey: "",
      apiUrl: "",
      keyLink: "https://bailian.console.aliyun.com/#/home",
      config: {
        temperature: {
          value: 0.7,
          enable: true,
        },
        stream: true,
        maxTokens: {
          value: 4096,
          enable: true,
        },
      },
      models: [
        {
          id: "qwen-max",
          name: "qwen-max",
          icon: qianwen,

          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        },
        {
          id: "qwen-plus",
          name: "qwen-plus",
          icon: qianwen,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        },
        {
          id: "qwen-turbo",
          name: "qwen-turbo",
          icon: qianwen,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        },
      ],
    },
    {
      id: "deepseek",
      name: "深度求索",
      icon: deepseek,
      enabled: false,
      apiKey: "",
      apiUrl: "",
      keyLink: "https://platform.deepseek.com",
      config: {
        temperature: {
          value: 0.7,
          enable: true,
        },
        stream: true,
        maxTokens: {
          value: 4096,
          enable: true,
        },
      },
      models: [
        {
          id: "deepseek-chat",
          name: "deepseek-chat",
          icon: deepseek,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },

        },
        {
          id: "deepseek-reasoner",
          name: "deepseek-reasoner",
          icon: deepseek,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        }
      ],
    },
    {
      id: "claude",
      name: "claude",
      icon: claude,
      enabled: false,
      apiKey: "",
      apiUrl: "",
      keyLink: "https://www.anthropic.com/",
      config: {
        temperature: {
          value: 0.7,
          enable: true,
        },
        stream: true,
        maxTokens: {
          value: 4096,
          enable: true,
        },
      },
      models: [
        {
          id: "claude-sonnet-4-20250514-thinking",
          name: "claude-sonnet-4-20250514-thinking",
          icon: claude,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        },
        {
          id: "claude-sonnet-4-20250514",
          name: "claude-sonnet-4-20250514",
          icon: claude,
          config: {
            temperature: {
              value: 0.7,
              enable: true,
            },
            stream: true,
            maxTokens: {
              value: 4096,
              enable: true,
            },
          },
        }
      ],
    }
  ])
  // 选中的模型
  const selectedModel = ref<SelectedModel | null>(null)
  // 方法
  const updateProviderApiKey = (providerId: string, apiKey: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (provider) {
      provider.apiKey = apiKey
    }
  }

  const updateProviderApiUrl = (providerId: string, apiUrl: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (provider) {
      provider.apiUrl = apiUrl
    }
  }

  const toggleProviderEnabled = (providerId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (provider) {
      provider.enabled = !provider.enabled
    }
  }

  const addProvider = (provider: Provider) => {
    providers.value.push(provider)
  }

  const removeProvider = (providerId: string) => {
    const index = providers.value.findIndex(p => p.id === providerId)
    if (index !== -1) {
      providers.value.splice(index, 1)
    }
  }

  const getProviderById = (providerId: string) => {
    return providers.value.find(p => p.id === providerId)
  }

  const getModelById = (providerId: string, modelId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return null
    const model = provider?.models.find(m => m.id === modelId)
    if (!model) return null
    return {
      ...model,
      apiKey: provider.apiKey,
      apiUrl: provider.apiUrl,
    }
  }

  // 选中模型相关方法
  const setSelectedModel = (model: SelectedModel) => {
    selectedModel.value = model
  }

  const clearSelectedModel = () => {
    selectedModel.value = null
  }

  // 自动匹配模型图标
  const getModelIcon = (modelName: string): string => {
    const name = modelName.toLowerCase()

    if (/qwen/.test(name)) {
      return qianwen
    } else if (/deepseek/.test(name)) {
      return deepseek
    } else if (/claude/.test(name)) {
      return claude
    } else if (/bailian/.test(name)) {
      return bailianPng
    }

    return '' // 默认返回空字符串
  }

  // 模型相关方法
  const addModel = (providerId: string, model: Model) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false

    // 检查模型ID是否已存在
    const existingModel = provider.models.find(m => m.id === model.id)
    if (existingModel) return false

    // 如果模型没有图标，自动匹配
    const modelWithIcon = {
      ...model,
      icon: model.icon || getModelIcon(model.id)
    }

    provider.models.push(modelWithIcon)
    return true
  }

  const updateModel = (providerId: string, modelId: string, updatedModel: Model) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false

    const modelIndex = provider.models.findIndex(m => m.id === modelId)
    if (modelIndex === -1) return false

    // 如果更新的模型没有图标，自动匹配
    const modelWithIcon = {
      ...updatedModel,
      icon: updatedModel.icon || getModelIcon(updatedModel.id)
    }

    provider.models[modelIndex] = modelWithIcon
    return true
  }

  const removeModel = (providerId: string, modelId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false

    const modelIndex = provider.models.findIndex(m => m.id === modelId)
    if (modelIndex === -1) return false

    provider.models.splice(modelIndex, 1)

    // 如果删除后没有模型了，且提供商已启用，自动禁用
    if (provider.models.length === 0 && provider.enabled) {
      provider.enabled = false
    }

    return true
  }





  return {
    // 状态
    providers,
    selectedModel,

    // 方法
    updateProviderApiKey,
    updateProviderApiUrl,
    toggleProviderEnabled,
    addProvider,
    removeProvider,
    getProviderById,
    getModelById,
    setSelectedModel,
    clearSelectedModel,
    addModel,
    updateModel,
    removeModel,
  }
}, {
  persist: {
    key: 'kedo-mind-model',
    storage: localStorage
  }
}) 