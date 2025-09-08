import request from '@/utils/request'

/**
 * 账号密码登录
 */
export const userLoginByAccount = (data: { f_Account: string; f_Password: string }) => {
  return request.post('/User/UserLoginByAccount', data)
}

/**
 * 手机验证码登录
 */
export const userLoginByMobile = (data: { f_Mobile: string; f_VerificationCode: string }) => {
  return request.post('/User/UserLoginByMobile', data)
}

/**
 * 获取验证码
 */
export const getVerificationCode = (data: { phoneNum: string }) => {
  return request.get('/User/GetVerificationCode', { params: data })
}

/**
 * 用户注册
 */
export const userRegist = (data: {
  f_Mobile: string;
  f_Password: string;
  f_VerificationCode: string;
  f_UserName?: string;
  f_CompanyName?: string;
  f_Email?: string;
  f_IndustryCategory?: string;
  f_Job?: string;
  f_Secretkey?: string;
}) => {
  return request.post('/User/UserRegist', data)
}

/**
 * 检查手机号是否已被使用
 */
export const checkPhoneNoIsUsed = (data: { f_Mobile: string }) => {
  return request.post('/User/CheckPhoneNoIsUsed', data)
}

/**
 * 找回密码
 */
export const getBackPassword = (data: {
  f_Mobile: string;
  f_VerificationCode: string;
  f_Password: string;
}) => {
  return request.post('/User/GetBackPassword', data)
}

/**
 * 微信登录
 */
export const userLoginByWechat = (data: {
  f_OpenId: string;
  f_UnionId: string;
  f_UserName: string;
  f_Sex: string;
  f_HeadImgurl: string;
  f_Mobile?: string;
  f_VerificationCode?: string;
}) => {
  return request.post('/User/UserLoginByWechat', data)
}

/**
 * 获取微信二维码信息
 */
export const getWeChatQRCodeInfo = () => {
  return request.get('/WeChat/GetQRCodeInfo')
}

/**
 * 根据微信二维码ticket获取用户信息
 */
export const getWeChatUserInfoByTick = (data: { scene_Id: string }) => {
  return request.get('/WeChat/GetUserInfoByTick', { params: data })
}

/**
 * 根据微信code获取用户信息
 */
export const getWeChatUserInfoByCode = (data: { code: string }) => {
  return request.post('/WeChat/GetUserInfoByCode', data)
}

/**
 * 修改用户手机号
 */
export const modifyUserPhoneNum = (data: {
  f_Id: string;
  f_PhoneNum: string;
  f_VerificationCode: string;
}) => {
  return request.post('/User/ModifyUserPhoneNum', data)
} 
/**
 * 谷歌登录
 */
export const getUserinfoByGoogle = (data: { authCode: string })=>{
  return request.get('/User/GetGoogleUserInfo',{params:data})
}
