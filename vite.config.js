import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(),viteCommonjs()],
  server: {
    port: 5174,
    host: true,
    open: false
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/style/theme.scss" as *;`,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    // minify: "terser",
    // terserOptions: {
    //   compress: {
    //     drop_console: true,
    //     drop_debugger: true,
    //   },
    // },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['ant-design-vue', '@ant-design/icons-vue']
        }
      }
    }
  },
});
