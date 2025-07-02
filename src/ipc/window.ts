import { ipcMain } from "electron"
import { IPC } from "./index"

export function registerWindowHandlers(ipc: IPC): void {
    ipcMain.handle("minimizeWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.minimize()
    })

    ipcMain.handle("maximizeWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.maximize()
    })

    ipcMain.handle("unmaximizeWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.unmaximize()
    })

    ipcMain.handle("closeWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.close()
    })

    ipcMain.handle("showWindow", async (): Promise<void> => {
        if (ipc.desktop.driveWindow?.isMinimized()) {
            ipc.desktop.driveWindow?.restore()
        } else {
            ipc.desktop.driveWindow?.show()
        }
    })

    ipcMain.handle("hideWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.hide()
    })

    ipcMain.handle("focusWindow", async (): Promise<void> => {
        ipc.desktop.driveWindow?.focus()
    })

    ipcMain.handle("toggleFullscreen", async (): Promise<void> => {
        const win = ipc.desktop.driveWindow

        if (win) {
            win.setFullScreen(!win.isFullScreen())
        }
    })

    ipcMain.handle("isWindowMaximized", async (): Promise<boolean> => {
        if (!ipc.desktop.driveWindow) {
            return false
        }

        return ipc.desktop.driveWindow.isMaximized()
    })

    ipcMain.handle("isWindowFullscreen", async (): Promise<boolean> => {
        if (!ipc.desktop.driveWindow) {
            return false
        }

        return ipc.desktop.driveWindow.isFullScreen()
    })
}
