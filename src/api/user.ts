import request from '@/utils/request'
import axios from 'axios';

/**
 * 根据token获取用户信息
 */
export const getUserInfoByToken = (data: any) => {
  return request.post('/User/UserLoginBySSOToken', data)
}

/**
 * 上传图片
 */
export const uploadImage = (file: Blob, userId: string, fileName: string) => {
  const formData = new FormData();
  formData.append('formFile', file, fileName);
  const url = `${import.meta.env.VITE_APP_BASE_URL}/Oss/UploadImg?userId=${userId}`;
  return new Promise((resolve, reject) => {
    axios.post(url, formData, {
      headers: {

      }
    }).then(res => {
      resolve(res.data);
    }).catch(err => {
      reject(err);
    });
  });
}
