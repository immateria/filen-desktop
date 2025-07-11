import { app, BrowserWindow, shell, dialog, crashReporter } from "electron"
import pathModule from "path"
import IPC from "./ipc"
import FilenSDK from "@filen/sdk"
import { waitForConfig } from "./config"
import Cloud from "./lib/cloud"
import FS from "./lib/fs"
import { IS_ELECTRON } from "./constants"
import Worker from "./worker"
import { getAppIcon } from "./assets"
import Updater from "./lib/updater"
import isDev from "./isDev"
import Logger from "./lib/logger"
import serveProd from "./lib/serve"
import WindowState from "./lib/windowState"
import Status from "./lib/status"
import Options from "./lib/options"
import { execCommand } from "./utils"
import { triggerRule } from "./lib/actions"
import os from "os"

if (IS_ELECTRON) {
	// Needs to be here, otherwise Chromium's FileSystemAccess API won't work. Waiting for the electron team to fix it.
	// Ref: https://github.com/electron/electron/issues/28422
	app?.commandLine.appendSwitch("enable-experimental-web-platform-features")
	app?.commandLine.appendSwitch("disable-renderer-backgrounding")
	app?.commandLine.appendSwitch("disable-pinch-zoom")
	app?.commandLine.appendSwitch("disable-pinch")
}

/**
 * FilenDesktop
 * @date 2/23/2024 - 3:49:42 AM
 *
 * @export
 * @class FilenDesktop
 * @typedef {FilenDesktop}
 */
export class FilenDesktop {
        public driveWindow: BrowserWindow | null = null
        public launcherWindow: BrowserWindow | null = null
        public automationWindow: BrowserWindow | null = null
	public readonly ipc: IPC
	public readonly sdk: FilenSDK
	public readonly worker: Worker
	public sdkInitialized: boolean = false
	public readonly lib: {
		cloud: Cloud
		fs: FS
	}
	public updater: Updater
	public logger: Logger
	public isUnityRunning: boolean = process.platform === "linux" ? app.isUnityRunning() : false
	public serve: (window: BrowserWindow) => Promise<void>
       public windowState: WindowState
       public minimizeToTray: boolean = false
       public enableURLProtocol: boolean = false
       public status: Status
       private urlProtocolRegistered = false
	public options: Options
	public shouldExitOnQuit: boolean = false

	/**
	 * Creates an instance of FilenDesktop.
	 * @date 2/23/2024 - 6:12:33 AM
	 *
	 * @constructor
	 * @public
	 */
	public constructor() {
		crashReporter.start({
			submitURL: undefined,
			productName: "io.filen.desktop",
			uploadToServer: false,
			ignoreSystemCrashHandler: false,
			rateLimit: false,
			compress: false,
			globalExtra: {
				cpus: os.cpus().length.toString(),
				ram: os.totalmem().toString(),
				platform: os.platform(),
				release: os.release()
			}
		})

		this.serve = serveProd()
		this.windowState = new WindowState()
		this.sdk = new FilenSDK()
		this.ipc = new IPC(this)
		this.lib = {
			cloud: new Cloud(this),
			fs: new FS(this)
		}
		this.worker = new Worker(this)
		this.updater = new Updater(this)
		this.logger = new Logger(false, false)
		this.status = new Status(this)
		this.options = new Options()
	}

	/**
	 * Initialize the SDK in the main thread.
	 *
	 * @private
	 * @async
	 * @returns {Promise<void>}
	 */
	private async initializeSDK(): Promise<void> {
		const config = await waitForConfig()

		this.sdk.init(config.sdkConfig)
		this.sdkInitialized = true

		this.logger.log("info", "SDK initialized")
	}

	/**
	 * Initialize the desktop client.
	 * @date 2/23/2024 - 3:49:49 AM
	 *
	 * @public
	 * @async
	 * @returns {Promise<void>}
	 */
	public async initialize(): Promise<void> {
		try {
			const lock = app.requestSingleInstanceLock()

			if (!lock) {
				app.exit(0)

				return
			}

                       const options = await this.options.get()

                       this.enableURLProtocol = options.enableURLProtocol ?? false

                       await app.whenReady()

                       if (this.enableURLProtocol) {
                               this.registerURLProtocol()
                       }

			if (options.startMinimized && process.platform === "darwin") {
				app?.dock?.hide()
			}

			await this.createLauncherWindow()

			this.initializeSDK()

			app.on("window-all-closed", () => {
				this.shouldExitOnQuit = true

				app.exit(0)
			})

                       app.on("second-instance", (_event, argv) => {
                               if (this.driveWindow) {
                                       if (this.driveWindow.isMinimized()) {
                                               this.driveWindow.restore()
                                       }

                                       this.driveWindow.focus()
                               }

                               if (this.enableURLProtocol) {
                                       this.handleProtocolArgv(argv)
                               }
                       })

			app.setAppUserModelId("io.filen.desktop")
			app.setName("Filen")

			if (process.platform === "win32") {
				app.setUserTasks([])
			}

			app.on("activate", () => {
				if (BrowserWindow.getAllWindows().length === 0) {
					this.createMainWindow().catch(err => {
						this.logger.log("error", err)
					})
				}
			})

			this.logger.log("info", "Starting worker and creating window")

			await this.worker.start()
			await this.createMainWindow()

			this.destroyLauncherWindow()

			setTimeout(() => {
				this.updater.initialize()
			}, 15000)

			this.logger.log("info", "Starting sync and http inside worker")

			this.worker.invoke("restartSync").catch(err => {
				this.logger.log("error", err, "sync.start")
				this.logger.log("error", err)
			})

			this.worker.invoke("restartHTTP").catch(err => {
				this.logger.log("error", err, "http.start")
				this.logger.log("error", err)
			})

			this.logger.log("info", "Started")
		} catch (e) {
			this.logger.log("error", e)

			throw e
		} finally {
			this.destroyLauncherWindow()
		}
	}

	private async createLauncherWindow(): Promise<void> {
		if (this.launcherWindow) {
			return
		}

		this.launcherWindow = new BrowserWindow({
			width: 200,
			height: 200,
			frame: false,
			title: "Filen",
			minWidth: 200,
			minHeight: 200,
			icon: getAppIcon(),
			skipTaskbar: true,
			backgroundColor: "rgba(0, 0, 0, 0)",
			transparent: true,
			hasShadow: true,
			center: true,
			alwaysOnTop: true,
			show: false,
			resizable: false,
			webPreferences: {
				devTools: false,
				zoomFactor: 1
			}
		})

		this.launcherWindow.webContents.setZoomFactor(1)
		this.launcherWindow.webContents.setVisualZoomLevelLimits(1, 1)

		this.launcherWindow.setIcon(getAppIcon())

		await this.launcherWindow.loadFile(pathModule.join("..", "public", "launcher.html"))

		const startMinimized = (await this.options.get()).startMinimized ?? false

		if (!app.commandLine.hasSwitch("hidden") && !process.argv.includes("--hidden") && !startMinimized) {
			this.launcherWindow.show()
		}
	}

        private destroyLauncherWindow(): void {
                if (!this.launcherWindow || this.launcherWindow.isDestroyed()) {
                        return
                }

                this.launcherWindow.destroy()
                this.launcherWindow = null
        }

       public async showAutomationWindow(): Promise<void> {
               if (!this.automationWindow) {
                       await this.createAutomationWindow()
               }

               this.automationWindow?.show()
       }

       private async createAutomationWindow(): Promise<void> {
               if (this.automationWindow) {
                       return
               }

               this.automationWindow = new BrowserWindow({
                       width: 600,
                       height: 400,
                       title: "Automation Rules",
                       resizable: true,
                       minimizable: false,
                       maximizable: false,
                       show: false,
                       parent: this.driveWindow ?? undefined,
                       webPreferences: {
                               contextIsolation: true,
                               preload: isDev
                                       ? pathModule.join(__dirname, "..", "dist", "preload.js")
                                       : pathModule.join(__dirname, "preload.js"),
                               devTools: isDev,
                               zoomFactor: 1
                       }
               })

               this.automationWindow.webContents.setZoomFactor(1)
               this.automationWindow.webContents.setVisualZoomLevelLimits(1, 1)

               await this.automationWindow.loadFile(pathModule.join("..", "public", "automations.html"))

               this.automationWindow.on("closed", () => {
                       this.automationWindow = null
               })
       }

       public registerURLProtocol(): void {
               if ((process.platform !== "darwin" && process.platform !== "win32") || this.urlProtocolRegistered) {
                       return
               }

               if (!app.isDefaultProtocolClient("filen")) {
                       app.setAsDefaultProtocolClient("filen")
               }

               if (process.platform === "darwin") {
                       app.on("open-url", (event, url) => {
                               event.preventDefault()
                               void this.handleProtocol(url)
                       })
               } else if (process.platform === "win32") {
                       this.handleProtocolArgv(process.argv)
               }

               this.urlProtocolRegistered = true
       }

       public unregisterURLProtocol(): void {
               if ((process.platform !== "darwin" && process.platform !== "win32") || !this.urlProtocolRegistered) {
                       return
               }

               app.removeAsDefaultProtocolClient("filen")

               if (process.platform === "darwin") {
                       app.removeAllListeners("open-url")
               }

               this.urlProtocolRegistered = false
       }

       private handleProtocolArgv(argv: string[]): void {
               const arg = argv.find(a => a.startsWith("filen://"))

               if (arg) {
                       void this.handleProtocol(arg)
               }
       }

        private async handleProtocol(url: string): Promise<void> {
                try {
                        const parsed = new URL(url)

                        switch (parsed.hostname) {
                                case "focus":
                                        this.showOrOpenDriveWindow()
                                        break
                                case "toggle-fullscreen":
                                        if (this.driveWindow) {
                                                this.driveWindow.setFullScreen(!this.driveWindow.isFullScreen())
                                        }
                                        break
                                case "run-applescript":
                                        {
                                                const script = parsed.searchParams.get("script")

                                                if (script) {
                                                        await execCommand(`osascript -e ${JSON.stringify(script)}`)
                                                }
                                        }
                                        break
                                case "trigger-rule":
                                        {
                                                const name = parsed.searchParams.get("name")

                                                if (name) {
                                                        await triggerRule(name)
                                                }
                                        }
                                        break
                        }
                } catch (err) {
                        this.logger.log("error", err)
                }
        }

	public showOrOpenDriveWindow(): void {
		if (BrowserWindow.getAllWindows().length === 0) {
			this.createMainWindow().catch(err => {
				this.logger.log("error", err)
			})

			return
		}

		if (this.driveWindow?.isMinimized()) {
			this.driveWindow?.restore()
		} else {
			this.driveWindow?.show()
		}
	}

	private async createMainWindow(): Promise<void> {
		if (this.driveWindow) {
			return
		}

		const [state, options] = await Promise.all([this.windowState.get(), this.options.get()])

		this.driveWindow = new BrowserWindow({
			width: state ? state.width : 1280,
			height: state ? state.height : 720,
			x: state ? state.x : undefined,
			y: state ? state.y : undefined,
			frame: false,
			title: "Filen",
			minWidth: 1024,
			minHeight: 576,
			titleBarStyle: "hidden",
			icon: getAppIcon(),
			trafficLightPosition: {
				x: 10,
				y: 10
			},
			backgroundColor: "rgba(0, 0, 0, 0)",
			hasShadow: true,
			show: false,
			webPreferences: {
				backgroundThrottling: false,
				autoplayPolicy: "no-user-gesture-required",
				contextIsolation: true,
				experimentalFeatures: true,
				preload: isDev ? pathModule.join(__dirname, "..", "dist", "preload.js") : pathModule.join(__dirname, "preload.js"),
				devTools: isDev,
				zoomFactor: 1
			}
		})

		this.driveWindow.webContents.setZoomFactor(1)
		this.driveWindow.webContents.setVisualZoomLevelLimits(1, 1)

		this.status.initialize()

		if (state) {
			this.driveWindow.setBounds({
				width: state.width,
				height: state.height,
				x: state.x,
				y: state.y
			})
		}

		this.windowState.manage(this.driveWindow)

		if (process.platform === "win32") {
			this.driveWindow?.setThumbarButtons([])
		}

		this.driveWindow?.on("closed", () => {
			this.driveWindow = null
		})

		this.driveWindow?.on("minimize", () => {
			if (process.platform === "darwin" && this.minimizeToTray) {
				app?.dock?.hide()
			}
		})

		this.driveWindow?.on("show", () => {
			if (process.platform === "darwin" && !app?.dock?.isVisible()) {
				app?.dock?.show()
			}
		})

		this.driveWindow?.on("close", e => {
			if ((process.platform === "darwin" || this.minimizeToTray) && !this.driveWindow?.isMinimized() && !this.shouldExitOnQuit) {
				e.preventDefault()

				this.driveWindow?.minimize()

				if (process.platform === "darwin" && this.minimizeToTray) {
					app?.dock?.hide()
				}
			}
		})

		// Open links in default external browser
		this.driveWindow?.webContents.setWindowOpenHandler(({ url }) => {
			shell.openExternal(url)

			return {
				action: "deny"
			}
		})

		if (isDev) {
			await this.driveWindow?.loadURL("http://localhost:5173")
		} else {
			await this.serve(this.driveWindow)
		}

		if (!app.commandLine.hasSwitch("hidden") && !process.argv.includes("--hidden") && !options.startMinimized) {
			this.driveWindow?.show()
		}
	}
}

if (IS_ELECTRON) {
	new FilenDesktop().initialize().catch(err => {
		console.error(err)

		dialog.showErrorBox("Could not launch Filen", err instanceof Error ? err.message : "Unknown error")

		setTimeout(() => {
			app?.exit(1)
		}, 3000)
	})
}

export { deserializeError, serializeError } from "@filen/sync"
export { DesktopAPI } from "./preload"
export * from "./utils"
export * from "./constants"

export default FilenDesktop
