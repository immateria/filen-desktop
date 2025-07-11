<br/>
<p align="center">
  <h3 align="center">Filen Desktop</h3>

  <p align="center">
    Desktop client including Syncing, Virtual Drive mounting, S3, WebDAV, File Browsing, Chats, Notes, Contacts and more.
    <br/>
    <br/>
  </p>
</p>

![Contributors](https://img.shields.io/github/contributors/FilenCloudDienste/filen-desktop?color=dark-green) ![Forks](https://img.shields.io/github/forks/FilenCloudDienste/filen-desktop?style=social) ![Stargazers](https://img.shields.io/github/stars/FilenCloudDienste/filen-desktop?style=social) ![Issues](https://img.shields.io/github/issues/FilenCloudDienste/filen-desktop) ![License](https://img.shields.io/github/license/FilenCloudDienste/filen-desktop)

### Installation and building

1. Clone repository

```sh
git clone https://github.com/FilenCloudDienste/filen-desktop filen-desktop
```

2. Update dependencies

```sh
cd filen-desktop && npm install
```

3. Running a development build

To run a development build you need to have "@filen/web" (`npm run dev`) running locally.

```sh
npm run dev
```

4. Build

```sh
npm run build:<os>

Where <os> is either "win", "mac" or "linux"

Building the client requires setting up signing and notarization. See "build/" directory and package.json key.
```

### URI and AppleScript integration

On macOS and Windows Filen can register the `filen://` URL scheme so other
applications can interact with the client. On macOS this can be used from
AppleScript and the feature can be toggled in the settings:

```applescript
open location "filen://focus"
open location "filen://toggle-fullscreen"
open location "filen://run-applescript?script=display%20dialog%20\"Hello\""
```

### Automation rules

Filen can execute user defined actions through a simple rule system. Rules are
stored in a `rules.json` file inside the application's user data directory. A
rule contains an array of actions. Actions can run AppleScript on macOS,
PowerShell on Windows, generic shell commands, small JavaScript snippets or one
of the built in internal actions.

Example `rules.json`:

```json
{
  "note": [
    {
      "type": "internal",
      "name": "createMarkdownNote",
      "params": { "path": "~/Notes/note.md", "content": "# Hello" }
    },
    { "type": "applescript", "script": "display dialog \"Note created\"" }
  ]
}
```

A rule can be triggered from other applications using the url
`filen://trigger-rule?name=note` or programmatically via the `triggerRule` IPC
handler.

Rules can also be edited from the **Automations** window available in the tray menu.

## License

Distributed under the AGPL-3.0 License. See [LICENSE](https://github.com/FilenCloudDienste/filen-desktop/blob/main/LICENSE.md) for more information.
