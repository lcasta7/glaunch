import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

class Apps {
	constructor(item) {
		this.head = item
		this.list = [item]
		this.#focusWin()
	}

	goNext() {
		let headIndex = this.list.indexOf(this.head)
		this.head = this.list[++headIndex % this.list.length]
		this.#focusWin()
	}

	insert(win) {
		this.list.push(win)
		this.head = win
		this.#focusWin()
	}

	switchToApp() {
		this.#focusWin()
	}

	deleteWin(metaWindow) {
		const index = this.list.findIndex(win => win === metaWindow)
		if (index === -1) return;

		if (this.head === metaWindow && this.list.length > 1) {
			this.goNext();
		}


		this.list.splice(index, 1)

		if (this.list.length === 0) {
			this.head = null;
		} else if (this.head === metaWindow) {
			this.head = this.list[0];
		}
	}

	#focusWin() {
		this.head.activate(global.get_current_time())
		this.#centerMouseOnWindow(this.head)
	}

	#centerMouseOnWindow(metaWindow) {
		let rect = metaWindow.get_frame_rect();

		// Calculate center point
		let x = rect.x + rect.width / 2;
		let y = rect.y + rect.height / 2;

		// Move pointer to center
		let seat = Clutter.get_default_backend().get_default_seat();
		seat.warp_pointer(x, y);
	}
}

class App {
	static shouldHandle(win) {
		throw new Error("shouldHandle method must be implemented by subclass");
	}
}

class PathApp extends App {
	static shouldHandle(win) {
		let appName = win.get_wm_class_instance();
		if (appName) {
			return true
		}
		return false
	}
}

class OtherApp extends App {
	static shouldHandle(win, boundedApps) {
		let appName = win.get_wm_class_instance();
		if (boundedApps.has(appName)) {
			return false
		}
		return true
	}
}

export default class Glaunch extends Extension {

	enable() {
		try {
			this._settings = this.getSettings();
			this._config = this._loadConfig();
			this._bindKeys();

			this._boundedApps = new Set(this._config.map((bind) => bind.app))
			this._appMap = this._getCurrentlyOpenedApps();

			global.window_manager.connect('map', (_, actor) => {
				let metaWindow = actor.meta_window;
				this._storeApp(metaWindow);
			});

			global.window_manager.connect('destroy', (_, actor) => {
				let metaWindow = actor.meta_window;
				this._cleanApp(metaWindow)
			});

		} catch (error) {
			console.error("Failed to enable glaunch:", error);
		}
	}

	_loadConfig() {
		const homedir = GLib.get_home_dir();
		const configDir = `${homedir}/.config/glaunch`;
		const file = Gio.File.new_for_path(`${configDir}/glaunch.conf`);


		try {
			if (!file.query_exists(null)) {
				//make the directory
				const dir = Gio.File.new_for_path(configDir);
				if (!dir.query_exists(null)) {
					dir.make_directory_with_parents(null);
				}

				//create the file
				const outputStream = file.create(Gio.FileCreateFlags.NONE, null);


				//write a sample in it
				const bytes = new GLib.Bytes('app_launch f9 firefox');
				outputStream.write_bytes(bytes, null);
				outputStream.close(null);
			}

		} catch (e) {
			logError(e, "Error Creating config file")
			return []
		}


		try {
			const [success, contents] = file.load_contents(null);
			if (!success) {
				return [];
			}

			const decoder = new TextDecoder('utf-8');
			const configText = decoder.decode(contents);

			const lines = configText.split('\n');
			let config = [];

			lines.forEach(line => {
				if (line.trim() === '' || line.trim().startsWith('#')) {
					return;
				}
				//start
				const parts = line.split(/\s+/);
				if (parts.length >= 3) {
					config.push({
						com: parts[0],
						key: parts[1],
						app: parts[2]
					});
				}
			});

			return config;
		} catch (e) {
			logError(e, "Error Reading config file")
			return []
		}
	}

	_getCurrentlyOpenedApps() {
		let openedAppsMap = new Map();
		let openedApps = global.display.get_tab_list(Meta.TabList.NORMAL, null)

		openedApps.forEach(appInstance => {
			let appName = appInstance.get_wm_class_instance()

			if (!appName) {
				return
			}

			if (!this._boundedApps.has(appName)) {
				appName = "other"
			}


			if (openedAppsMap.has(appName)) {
				let appCollection = openedAppsMap.get(appName)
				appCollection.list.push(appInstance)
				appCollection.index = ++appCollection.index % appCollection.list.length

			} else {
				openedAppsMap.set(appName, new Apps(appInstance))
			}
		})

		return openedAppsMap
	}


	_storeApp(metaWindow) {
		let appName = metaWindow.get_wm_class_instance();
		if (!appName || appName === 'gjs') return;
		if (metaWindow.window_type !== Meta.WindowType.NORMAL) return;

		if (OtherApp.shouldHandle(metaWindow, this._boundedApps)) {
			appName = "other"
		}

		if (PathApp.shouldHandle(metaWindow)) {
			if (this._appMap.has(appName)) {
				let appCol = this._appMap.get(appName)
				appCol.insert(metaWindow)
			} else {
				this._appMap.set(appName, new Apps(metaWindow))
			}
		}
	}

	_cleanApp(metaWindow) {
		let appName = metaWindow.get_wm_class_instance();

		if (!appName) return;
		if (!this._boundedApps.has(appName)) {
			appName = "other";
		}

		if (this._appMap.has(appName)) {
			let appCol = this._appMap.get(appName);
			appCol.deleteWin(metaWindow)

			if (appCol.list.length === 0) {
				this._appMap.delete(appName);
			}
		}
	}

	// what happens when it's other?
	_handleApp(appName) {
		let focusedWindow = global.display.focus_window;
		let focusedAppName = focusedWindow ? focusedWindow.get_wm_class_instance() : null;

		if (focusedAppName === appName
			&& this._appMap.has(appName)) {
			this._appMap.get(appName).goNext()
		} else if (this._appMap.has(appName)) {
			this._appMap.get(appName).switchToApp()
		} else {
			const app = Gio.AppInfo.create_from_commandline(appName,
				null,
				Gio.AppInfoCreateFlags.NONE)
			app.launch([], null)
		}
	}

	_handleOther(appName) {
		let focusedWindow = global.display.focus_window;
		let focusedAppName = focusedWindow ? focusedWindow.get_wm_class_instance() : null;

		//we're in bounded so we need to switch to other
		if (this._boundedApps.has(focusedAppName)) {
			this._appMap.get(appName).switchToApp()
		}//we're already in "other"
		else {
			this._appMap.get(appName).goNext()
		}

	}

	_bindKeys() {
		this._config.forEach((bind, _) => {
			if (bind.com == "app_launch_path") {
				Main.wm.addKeybinding(
					bind.key,
					this._settings,
					Meta.KeyBindingFlags.NONE,
					Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
					() => this._handleApp(bind.app))
			}

			if (bind.com = "app_launch_other") {
				Main.wm.addKeybinding(
					bind.key,
					this._settings,
					Meta.KeyBindingFlags.NONE,
					Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
					() => this._handleOther(bind.app))
			}
		})
	}

	disable() {
		this._config.forEach((bind, _) => {
			Main.wm.removeKeybinding(bind.key)
		})

		if (this._settings) {
			this._settings.run_dispose()
			this._settings = null
		}
	}
}
