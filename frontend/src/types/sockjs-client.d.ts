declare module 'sockjs-client' {
  export default class SockJS {
    constructor(url: string, protocols?: string | string[], options?: any)
    onopen: ((event: any) => void) | null
    onmessage: ((event: any) => void) | null
    onclose: ((event: any) => void) | null
    onerror: ((event: any) => void) | null
    readyState: number
    send(data: string): void
    close(code?: number, reason?: string): void
  }
}

