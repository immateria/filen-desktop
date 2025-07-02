import { type FilenDesktop } from ".."
import { PauseSignal } from "@filen/sdk"

import { registerGeneralHandlers } from "./general"
import { registerWindowHandlers } from "./window"
import { registerCloudHandlers } from "./cloud"
import { registerWebDAVHandlers } from "./webdav"
import { registerS3Handlers } from "./s3"
import { registerNetworkDriveHandlers } from "./networkDrive"
import { registerSyncHandlers } from "./sync"

import { type MainToWindowMessage } from "./types"
export * from "./types"
export {
    registerGeneralHandlers,
    registerWindowHandlers,
    registerCloudHandlers,
    registerWebDAVHandlers,
    registerS3Handlers,
    registerNetworkDriveHandlers,
    registerSyncHandlers
}

export class IPC {
    public readonly desktop: FilenDesktop
    public didCallRestart = false
    public readonly pauseSignals: Record<string, PauseSignal> = {}
    public readonly abortControllers: Record<string, AbortController> = {}

    public constructor(desktop: FilenDesktop) {
        this.desktop = desktop

        registerGeneralHandlers(this)
        registerWindowHandlers(this)
        registerCloudHandlers(this)
        registerWebDAVHandlers(this)
        registerS3Handlers(this)
        registerNetworkDriveHandlers(this)
        registerSyncHandlers(this)
    }

    public postMainToWindowMessage(message: MainToWindowMessage): void {
        if (!this.desktop.driveWindow) {
            return
        }

        this.desktop.driveWindow.webContents.postMessage("mainToWindowMessage", message)
    }
}

export default IPC
