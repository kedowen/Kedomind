<template>
  <div class="md-image">
    <img
      class="md-image-thumb"
      :src="src"
      :alt="alt"
      :title="title"
      draggable="false"
      @click="open"
    />

    <teleport to="body">
      <div v-if="visible" class="md-image-overlay" :class="themeClass" @click.self="close">
        <!-- 右上角关闭按钮 -->
        <div class="md-image-close-btn">
          <a-tooltip title="关闭图片预览" placement="bottomLeft">
            <a-button type="text" shape="circle" @click="close">
              <CloseOutlined />
            </a-button>
          </a-tooltip>
        </div>

        <div class="md-image-stage" @wheel.prevent="onWheel">
          <img
            class="md-image-zoom"
            :src="src"
            :alt="alt"
            draggable="false"
            :style="zoomStyle"
          />
        </div>

        <div class="md-image-bottom-toolbar">
          <a-space :size="4">
            <a-tooltip title="缩小">
              <a-button type="text" shape="circle" @click="zoomOut">
                <MinusOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="放大">
              <a-button type="text" shape="circle" @click="zoomIn">
                <PlusOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="重置">
              <a-button type="text" shape="circle" @click="resetZoom">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>
            <a-divider type="vertical" />
            <a-tooltip title="复制">
              <a-button type="text" shape="circle" @click="copyImage">
                <CopyOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="下载">
              <a-button type="text" shape="circle" @click="downloadImage">
                <DownloadOutlined />
              </a-button>
            </a-tooltip>
            <a-divider type="vertical" />
            <a-tooltip title="关闭">
              <a-button type="text" shape="circle" @click="close">
                <CloseOutlined />
              </a-button>
            </a-tooltip>
          </a-space>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, MinusOutlined, ReloadOutlined, CopyOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { saveAs } from 'file-saver'

const props = defineProps<{
  src: string
  alt?: string
  title?: string
  theme?: 'light' | 'dark'
}>()

const visible = ref(false)
const scale = ref(1)
const MIN_SCALE = 0.2
const MAX_SCALE = 5
const STEP = 0.2

const zoomStyle = computed(() => ({
  transform: `scale(${scale.value})`
}))

// 计算主题class名
const themeClass = computed(() => `markdown-${props.theme || 'light'}`)

const open = () => {
  visible.value = true
  scale.value = 1
  document.body.style.overflow = 'hidden'
}

const close = () => {
  visible.value = false
  document.body.style.overflow = ''
}

const zoomIn = () => {
  scale.value = Math.min(MAX_SCALE, +(scale.value + STEP).toFixed(2))
}
const zoomOut = () => {
  scale.value = Math.max(MIN_SCALE, +(scale.value - STEP).toFixed(2))
}
const resetZoom = () => {
  scale.value = 1
}

const onWheel = (e: WheelEvent) => {
  if (e.deltaY > 0) zoomOut()
  else zoomIn()
}

const onKeydown = (e: KeyboardEvent) => {
  if (!visible.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomIn()
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomOut()
  } else if (e.key.toLowerCase() === 'r') {
    e.preventDefault()
    resetZoom()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

// 复制图片：只复制图片本身到剪贴板
const copyImage = async () => {
  try {
    const response = await fetch(props.src)
    const blob = await response.blob()
    const clipboard: any = (navigator as any).clipboard
    const ClipboardItemCtor: any = (window as any).ClipboardItem
    
    if (clipboard && ClipboardItemCtor) {
      // 使用 Canvas 将图片转换为 PNG 格式，提高兼容性
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(blob)
      })
      
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob(async (pngBlob) => {
        if (pngBlob) {
          try {
            await clipboard.write([new ClipboardItemCtor({ 'image/png': pngBlob })])
            message.success('图片已复制到剪贴板')
          } catch (clipboardErr) {
            console.log('Clipboard write error:', clipboardErr)
            message.error('复制图片失败')
          }
        } else {
          message.error('图片转换失败')
        }
      }, 'image/png')
      
      URL.revokeObjectURL(img.src)
    } else {
      message.error('当前浏览器不支持复制图片')
    }
  } catch (err) {
    console.log('Copy image error:', err)
    message.error('复制图片失败')
  }
}

// 下载图片：优先 Blob 保存，失败回退浏览器下载
const downloadImage = async () => {
  const filenameHint = props.title || 'image'
  try {
    const response = await fetch(props.src)
    const blob = await response.blob()
    const ext = (blob.type && blob.type.split('/')[1]) || 'png'
    saveAs(blob, `${filenameHint}.${ext}`)
  } catch (err) {
    const a = document.createElement('a')
    a.href = props.src
    a.download = filenameHint
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

defineExpose({ open })
</script>

<style scoped>
.md-image {
  position: relative;
  display: inline-block;
}

.md-image-thumb {
  max-width: 520px;
  max-height: 520px;
  border-radius: 6px;
  margin: 6px 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-drag: none;
  object-fit: contain;
}

.md-image-overlay {
  position: fixed;
  inset: 0;
  background: var(--md-image-overlay-bg);
  backdrop-filter: saturate(120%) blur(4px);
  -webkit-backdrop-filter: saturate(120%) blur(4px);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

/* 右上角关闭按钮样式 */
.md-image-close-btn {
  position: absolute;
  top: 30px;
  right: 12px;
  z-index: 11;
}

.md-image-close-btn :deep(.ant-btn) {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--md-image-btn-bg);
  border: none;
  box-shadow: 0 4px 12px var(--md-image-btn-shadow);
  transition: all 0.2s ease;
}

.md-image-close-btn :deep(.ant-btn:hover) {
  background: var(--md-image-btn-hover-bg);
  box-shadow: 0 6px 16px var(--md-image-btn-hover-shadow);
  transform: scale(1.05);
}

.md-image-close-btn :deep(.anticon) {
  font-size: 18px;
  color: var(--md-image-icon-color);
}

.md-image-close-btn :deep(.ant-btn:hover .anticon) {
  color: var(--md-image-icon-hover-color);
}

.md-image-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.md-image-zoom {
  max-width: 90vw;
  max-height: 80vh;
  transition: transform 0.15s ease;
  will-change: transform;
}

.md-image-bottom-toolbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  padding: 10px 16px;
  gap: 12px;
  background: var(--md-image-toolbar-bg);
  border-radius: 20px;
  box-shadow: 0 6px 24px var(--md-image-toolbar-shadow);
  color: var(--md-image-icon-color);
}

.md-image-bottom-toolbar :deep(.ant-btn) {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.md-image-bottom-toolbar :deep(.anticon) {
  font-size: 20px;
}

.md-image-bottom-toolbar :deep(.ant-divider-vertical) {
  height: 28px;
  margin: 0 4px;
  border-inline-start-color: var(--md-image-divider-color);
}
</style> 
