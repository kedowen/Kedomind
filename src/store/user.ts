import { defineStore } from "pinia";

export interface UserState {
  id: number | string
  name: string
  avatar: string
  mobile: string
}

export const useUserStore = defineStore(
  "user",
  {
    state: ():UserState => {
      return {
        id: '',
        name: "",
        avatar: "",
        mobile: ""
      }
    },
    getters: {
      getUserInfo: (state) => {
        return state
      },
      getUserAvatar: (state) => {
        return state.avatar
      },
      getUserName: (state) => {
        return state.name
      },
      getUserId: (state) => {
        return state.id
      },
      getUserMobile: (state) => {
        return state.mobile
      }
    },
    actions: {
      setName(name: string) {
        this.name = name
      },
      setAvatar(avatar: string) {
        this.avatar = avatar
      },
      setId(id: number | string) {
        this.id = id
      },
      setMobile(mobile: string) {
        this.mobile = mobile
      },
      clearUserInfo() {
        this.id = ''
        this.name = ''
        this.avatar = ''
        this.mobile = ''
      }
    },
    persist: {
      key: 'kedo-mind-user',
      storage: localStorage
    }
  }
);