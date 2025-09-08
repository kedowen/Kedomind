import axios, { AxiosResponse, AxiosError } from 'axios';
import { message } from 'ant-design-vue';
import {useStorage} from '@/hooks'

const {getToken} = useStorage()
// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL, // 从环境变量获取基础URL
  timeout: 15000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    // 对请求错误做些什么
    message.error('请求发送失败');
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    
    // 这里可以根据后端的数据结构进行调整
    if (data.statusCode === 200 || data.statusCode === 0) {
      return data;
    } else {
      message.error(data.errors || '请求失败');
      return Promise.reject(new Error(data.errors || '请求失败'));
    }
  },
  (error: AxiosError) => {
    // 处理 HTTP 状态码错误
    let errorMessage = '请求失败';
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMessage = '未授权，请重新登录';
          // 这里可以添加重定向到登录页的逻辑
          break;
        case 403:
          errorMessage = '拒绝访问';
          break;
        case 404:
          errorMessage = '请求错误，未找到该资源';
          break;
        case 500:
          errorMessage = '服务器错误';
          break;
        default:
          errorMessage = `连接错误${status}`;
      }
    } else if (error.request) {
      errorMessage = '网络错误，请检查您的网络连接';
    }
    
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

export default service; 