export function awaitWrapper(promise) {
  return promise.then((res) => [null, res])
      .catch((err) => [err, null])
}

export * from './chat'
export * from './library'
export * from './auth'
export * from './history'
export * from './user'
export * from './mcp'
export * from './electron'
export * from './pay'
