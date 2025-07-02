import { ipcMain } from "electron"
import os from "os"
import {
    isUnixMountPointValid,
    isUnixMountPointEmpty,
    isWinFSPInstalled,
    isFUSE3InstalledOnLinux,
    isFUSETInstalledOnMacOS
} from "@filen/network-drive"
import { IPC } from "./index"

export function registerNetworkDriveHandlers(ipc: IPC): void {
    ipcMain.handle("startNetworkDrive", async () => {
        await ipc.desktop.worker.invoke("startNetworkDrive")
    })

    ipcMain.handle("stopNetworkDrive", async () => {
        await ipc.desktop.worker.invoke("stopNetworkDrive")
    })

    ipcMain.handle("restartNetworkDrive", async () => {
        await ipc.desktop.worker.invoke("restartNetworkDrive")
    })

    ipcMain.handle("isNetworkDriveMounted", async () => {
        return await ipc.desktop.worker.isNetworkDriveMounted()
    })

    ipcMain.handle("networkDriveAvailableCache", async () => {
        return await ipc.desktop.worker.invoke("networkDriveAvailableCacheSize")
    })

    ipcMain.handle("networkDriveStats", async () => {
        return await ipc.desktop.worker.invoke("networkDriveStats")
    })

    ipcMain.handle("networkDriveCacheSize", async () => {
        return await ipc.desktop.worker.invoke("networkDriveCacheSize")
    })

    ipcMain.handle("networkDriveCleanupCache", async () => {
        await ipc.desktop.worker.invoke("networkDriveCleanupCache")
    })

    ipcMain.handle("networkDriveCleanupLocalDir", async () => {
        await ipc.desktop.worker.invoke("networkDriveCleanupLocalDir")
    })

    ipcMain.handle("isNetworkDriveActive", async () => {
        return await ipc.desktop.worker.invoke("isNetworkDriveActive")
    })

    ipcMain.handle("isWinFSPInstalled", async () => {
        if (process.platform !== "win32") {
            return false
        }

        return await isWinFSPInstalled()
    })

    ipcMain.handle("isFUSE3InstalledOnLinux", async () => {
        if (process.platform !== "linux") {
            return false
        }

        return await isFUSE3InstalledOnLinux()
    })

    ipcMain.handle("isFUSETInstalledOnMacOS", async () => {
        if (process.platform !== "darwin") {
            return false
        }

        return await isFUSETInstalledOnMacOS()
    })

    ipcMain.handle("isUnixMountPointValid", async (_, path: string): Promise<boolean> => {
        if (process.platform === "win32") {
            return false
        }

        return await isUnixMountPointValid(path)
    })

    ipcMain.handle("isUnixMountPointEmpty", async (_, path: string): Promise<boolean> => {
        if (process.platform === "win32") {
            return false
        }

        return await isUnixMountPointEmpty(path)
    })

    ipcMain.handle("doesPathStartWithHomeDir", async (_, path: string) => {
        if (process.platform === "win32") {
            return path.startsWith(os.homedir() + "\\")
        }

        if (process.platform === "linux" || process.platform === "darwin") {
            return path.startsWith(os.homedir() + "/")
        }
        return false
    })
}
