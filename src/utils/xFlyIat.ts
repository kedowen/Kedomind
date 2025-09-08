import CryptoJS from 'crypto-js'

const hex_md5 = (str) => {
    return CryptoJS.MD5(str).toString()
}

const hmacSHA1 = (data, key) => {
    const signatureSha = CryptoJS.HmacSHA1(data, key);
    return CryptoJS.enc.Base64.stringify(signatureSha);
}
export const formatSeconds = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    // 添加前导零
    const formattedHours = (hours < 10) ? "0" + hours : hours;
    const formattedMinutes = (minutes < 10) ? "0" + minutes : minutes;
    const formattedSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;
    return formattedHours + ":" + formattedMinutes + ":" + formattedSeconds;
}

export enum RECORD_STATE_ENUM {
    UNDEFINED = "UNDEFINED",
    CONNECTING = "CONNECTING",
    OPEN = "OPEN",
    CLOSING = "CLOSING",
    CLOSED = "CLOSED",
}


export class XFlyIatManager {
    private static instance: XFlyIatManager;
    private state: RECORD_STATE_ENUM = RECORD_STATE_ENUM.UNDEFINED;
    private iatWs: WebSocket | null = null;
    private recorder: any;
    private constructor() {

        this.initRecorder();
    }

    public static getInstance(): XFlyIatManager {
        if (!XFlyIatManager.instance) {
            XFlyIatManager.instance = new XFlyIatManager();
        }
        return XFlyIatManager.instance;
    }
    private initRecorder() {
        // 使用相对路径，适用于Electron环境
        this.recorder = new RecorderManager("./xFlyIat/dist");
        this.recorder.onStart = () => {
            console.log("started");
            this.state = RECORD_STATE_ENUM.OPEN;
        };
        this.recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
            if (this.iatWs && this.iatWs.readyState === this.iatWs.OPEN) {
                this.iatWs.send(new Int8Array(frameBuffer));
                if (isLastFrame) {
                    this.iatWs.send('{"end": true}');
                    this.state = RECORD_STATE_ENUM.CLOSING;
                }
            }
        };
        this.recorder.onStop = () => {
            console.log("stopped");
        };
    }

    /**
     * 检查录音权限
     * @returns 
     */
    private async checkRecordingPermission() {
        try {
            // 请求用户媒体设备（音频输入）
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 如果成功获取到流，说明录音权限已打开
            console.log("录音权限已打开");
            // 停止并释放媒体流（不再需要时）
            stream.getTracks().forEach((track) => track.stop());
            return true;
        } catch (error: any) {
            // 处理错误
            if (
                error.name === "NotAllowedError" ||
                error.name === "PermissionDeniedError"
            ) {
                console.log("录音权限被拒绝");
            } else if (
                error.name === "NotFoundError" ||
                error.name === "DevicesNotFoundError"
            ) {
                console.log("没有找到音频输入设备");
            } else if (
                error.name === "NotSupportedError" ||
                error.name === "SecurityError"
            ) {
            } else {
                console.error("获取录音权限时发生未知错误:", error);
            }
            return false;
        }
    }

    /**
     * 获取WebSocket连接URL
     * @returns 
     */
    private getWebSocketUrl() {
        const url = "wss://rtasr.xfyun.cn/v1/ws"
        const appId = 'c96cf762'
        const secretKey = 'afcc3e0a1f01d4ae2e719d469c0fcb89'
        const ts = Math.floor(new Date().getTime() / 1000)
        const signa = hex_md5(appId + ts)
        const signature = encodeURIComponent(hmacSHA1(signa, secretKey))
        return `${url}?appid=${appId}&ts=${ts}&signa=${signature}&roleType=2`;
    }

    private connectWebSocket(callback?: (str: string, state: RECORD_STATE_ENUM) => void) {
        const websocketUrl = this.getWebSocketUrl();
        if ("WebSocket" in window) {
            this.iatWs = new WebSocket(websocketUrl);
        } else if ("MozWebSocket" in window) {
            this.iatWs = new (window as any).MozWebSocket(websocketUrl);
        } else {
            this.state = RECORD_STATE_ENUM.CLOSED;
            callback && callback("", this.state);
            return;
        }
        this.state = RECORD_STATE_ENUM.CONNECTING;
        if (!this.iatWs) {
            return;
        }
        this.iatWs.onopen = (e) => {
            // 开始录音
            this.recorder
                .start({
                    sampleRate: 16000,
                    frameSize: 1280,
                })
                .then(() => {
                    this.state = RECORD_STATE_ENUM.OPEN;
                    callback && callback("", this.state);
                })
                .catch((err) => {
                    console.error(err);
                    this.state = RECORD_STATE_ENUM.CLOSED;
                    callback && callback("", this.state);
                });
        };
        this.iatWs.onmessage = (e) => {
            console.log("onmessage", e);
            const result = this.renderResult(e.data);
            callback && callback(result, this.state);
        };
        this.iatWs.onerror = (e) => {
            console.error("onerror", e);
            this.recorder.stop();
            this.state = RECORD_STATE_ENUM.CLOSED;
            callback && callback("", this.state);
        };
        this.iatWs.onclose = (e) => {
            console.log("onclose", e);
            this.recorder.stop();
            this.state = RECORD_STATE_ENUM.CLOSED;
            callback && callback("", this.state);
        };
    }

    private renderResult(resultData) {
        let jsonData = JSON.parse(resultData);
        if (jsonData.action == "started") {
            // 握手成功
            console.log("握手成功");
        } else if (jsonData.action == "result") {
            const data = JSON.parse(jsonData.data);
            console.log(data);
            // 转写结果
            let resultTextTemp = "";
            data.cn.st.rt.forEach((j) => {
                j.ws.forEach((k) => {
                    k.cw.forEach((l) => {
                        resultTextTemp += l.w;
                    });
                });
            });
            if (data.cn.st.type == 0) {
                return resultTextTemp;
            }
        } else if (jsonData.action == "error") {
            // 连接发生错误
            console.log("出错了:", jsonData);
            // return "出错了:" + jsonData?.desc;
        }
        return "";
    }

    public async startRecord(callback?: (str: string, state: RECORD_STATE_ENUM) => void) {
        if (this.state === RECORD_STATE_ENUM.UNDEFINED || this.state === RECORD_STATE_ENUM.CLOSED) {
            const isOpenRecord = await this.checkRecordingPermission();
            if (isOpenRecord) {
                this.connectWebSocket(callback);
            }
        }
        this.stopRecord();
    }

    public stopRecord() {
        if (this.state === RECORD_STATE_ENUM.CONNECTING || this.state === RECORD_STATE_ENUM.OPEN) {
            // 结束录音
            this.recorder.stop();
        }
    }
}

export const xFlyIatManager = XFlyIatManager.getInstance();








