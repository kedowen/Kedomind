import mitt from 'mitt'

export const BusEvents = mitt()

// emit(name,data)
// 触发事件，两个参数：name：触发的方法名，data：需要传递的参数
// on(name,callback)
// 绑定事件，两个参数：name：绑定的方法名，callback：触发后执行的回调函数
// off(name)
// 解绑事件，一个参数：name：需要解绑的方法名