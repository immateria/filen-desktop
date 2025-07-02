import { app } from "electron"
import fs from "fs-extra"
import path from "path"
import { execCommand } from "../utils"

export type ExternalAction =
        | { type: "applescript"; script: string }
        | { type: "powershell"; script: string }
        | { type: "shell"; script: string }
        | { type: "javascript"; script: string }

export type InternalAction = {
        type: "internal"
        name: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params?: any
}

export type Action = ExternalAction | InternalAction

export type RuleConfig = Record<string, Action[]>

const internalActions: Record<string, (params?: any) => Promise<unknown>> = {
        async createMarkdownNote({ path: notePath, content }: { path: string; content: string }): Promise<void> {
                await fs.outputFile(notePath, content)
        },
        async updateFolder({ path: folderPath }: { path: string }): Promise<void> {
                await fs.ensureDir(folderPath)
        }
}

export async function runAction(action: Action): Promise<string> {
        switch (action.type) {
                case "applescript":
                        if (process.platform !== "darwin") {
                                return ""
                        }

                        return await execCommand(`osascript -e ${JSON.stringify(action.script)}`)
                case "powershell":
                        if (process.platform !== "win32") {
                                return ""
                        }

                        return await execCommand(`powershell -Command ${JSON.stringify(action.script)}`)
                case "shell":
                        return await execCommand(action.script)
                case "javascript":
                        {
                                const vm = await import("vm")
                                const script = new vm.Script(action.script)
                                return String(script.runInNewContext({}))
                        }
               case "internal":
                       {
                               const handler = internalActions[action.name]

                               if (handler) {
                                       const result = await handler(action.params)
                                       return typeof result === "string" ? result : ""
                               }

                               throw new Error(`Unknown internal action: ${action.name}`)
                       }
        }
}

export function rulesFilePath(): string {
        return path.join(app.getPath("userData"), "rules.json")
}

export async function loadRules(): Promise<RuleConfig> {
        try {
                return await fs.readJSON(rulesFilePath())
        } catch {
                return {}
        }
}

export async function saveRules(rules: RuleConfig): Promise<void> {
        await fs.outputJSON(rulesFilePath(), rules, { spaces: 2 })
}

export async function triggerRule(name: string): Promise<void> {
        const rules = await loadRules()
        const actions = rules[name]

        if (!actions) {
                throw new Error(`Rule ${name} not found`)
        }

        for (const action of actions) {
                await runAction(action)
        }
}
