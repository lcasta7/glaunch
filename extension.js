import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

class AppCollection {
	constructor(item) {
		this.index = 0;
		this.list = [item];
	}
}

export default class Glaunch extends Extension {

	enable() {
		try {
			this._settings = this.getSettings();
			this._config = this._loadConfig();
			this._bindKeys();

			this._boundedApps = new Set(this._config.map((bind) => bind.app))

			this._apps = this._getCurrentlyOpenedApps();
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
				if (line.startsWith('app_launch')) {
					const parts = line.split(/\s+/);
					if (parts.length >= 3) {
						config.push({
							key: parts[1],
							app: parts[2]
						});
					}
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

			//handle "other"
			if (!this._boundedApps.has(appName)) {
				appName = "other"
			}


			if (openedAppsMap.has(appName)) {
				let appCollection = openedAppsMap.get(appName)
				appCollection.list.push(appInstance)
				appCollection.index = ++appCollection.index % appCollection.list.length

			} else {
				openedAppsMap.set(appName, new AppCollection(appInstance))
			}
		})

		return openedAppsMap
	}

	_centerMouseOnWindow(metaWindow) {
		let rect = metaWindow.get_frame_rect();

		// Calculate center point
		let x = rect.x + rect.width / 2;
		let y = rect.y + rect.height / 2;

		// Move pointer to center
		let seat = Clutter.get_default_backend().get_default_seat();
		seat.warp_pointer(x, y);
	}

	_storeApp(metaWindow) {
		let appName = metaWindow.get_wm_class_instance();
		if (!appName || appName === 'gjs') return;
		if (metaWindow.window_type !== Meta.WindowType.NORMAL) return;

		if (!this._boundedApps.has(appName)) {
			appName = "other";
		}

		if (this._apps.has(appName)) {
			let appCollection = this._apps.get(appName)
			appCollection.list.push(metaWindow)
			appCollection.index = ++appCollection.index % appCollection.list.length

		} else {
			this._apps.set(appName, new AppCollection(metaWindow))
		}

		this._centerMouseOnWindow(metaWindow);
		this._apps.forEach((value, key) => {
			log(`[MyExtension] App: ${key}, Number of windows: ${value.list.length}`);
			value.list.forEach((window, index) => {
				log(`[MyExtension]   Window ${index}: ${window.get_title()}`);
			});
		});
	}

	_cleanApp(metaWindow) {
		log('DEBUG_MYAPP: _cleanApp called');
		let appName = metaWindow.get_wm_class_instance();

		log(`[MyExtension] cleaning ${appName}`);
		if (!appName) return;

		if (!this._boundedApps.has(appName)) {
			appName = "other";
		}

		if (this._apps.has(appName)) {
			let appCollection = this._apps.get(appName);
			// Remove this specific window from the list
			appCollection.list = appCollection.list.filter(win => win !== metaWindow);

			// If no windows left for this app, remove the app entry entirely
			if (appCollection.list.length === 0) {
				this._apps.delete(appName);
			}

			// Log the current state for debugging
			this._apps.forEach((value, key) => {
				log(`[MyExtension] App: ${key}, Number of windows: ${value.list.length}`);
				value.list.forEach((window, index) => {
					log(`[MyExtension]   Window ${index}: ${window.get_title()}`);
				});
			});
		}
	}

	_focusWindow(window) {
		window.activate(global.get_current_time())
		this._centerMouseOnWindow(window)
	}


	_launchOrSwitchApp(appName) {

		log(`DEBUG_MYAPP: _launch called with appName=${appName}`)
		let focusedWindow = global.display.focus_window

		//TODO
		if (appName === "other") {
			this._handleOther(focusedWindow)
			return
		}



		//if we're currently on the same type of app - switch
		log(`DEBUG_MYAPP: _launch called with focusedWindow=${focusedWindow}`)
		if (focusedWindow
			&& (focusedWindow.get_wm_class_instance() === appName
				|| !this._boundedApps.has(focusedWindow.get_wm_class_instance()))
			&& this._apps.has(appName)
			&& this._apps.get(appName).list.length > 1) {

			log('DEBUG_MYAPP: _launch switching between apps')
			let appCollection = this._apps.get(appName)
			appCollection.index = ++appCollection.index % appCollection.list.length

			let nextWindow = appCollection.list[appCollection.index]
			this._focusWindow(nextWindow)
		} else if (this._apps.has(appName)) { //switch to the app

			log('DEBUG_MYAPP: _launch switching to app')
			let appCollection = this._apps.get(appName)
			let index = appCollection.index % appCollection.list.length

			log(`DEBUG_MYAPP: _launch switching to app index=${index}`)

			let currentWindow = appCollection.list[index]
			this._focusWindow(currentWindow)
		} else { //launch app
			log('DEBUG_MYAPP: _launch launching app')
			this._apps.set()
			const app = Gio.AppInfo.create_from_commandline(appName, null, Gio.AppInfoCreateFlags.NONE)
			app.launch([], null)
		}
	}

	_handleOther(focusedWindow) {
		let focusedName = focusedWindow.get_wm_class_instance()

		// if we're not bounded, then we're already in other
		if (!this._boundedApps.has(focusedName)) {
			let appCollection = this._apps.get("other")
			appCollection.index = ++appCollection.index % appCollection.list.length

			let nextWindow = appCollection.list[appCollection.index]
			this._focusWindow(nextWindow)
		} else { //need to switch to other
			let appCollection = this._apps.get("other")
			let index = appCollection.index % appCollection.list.length

			let currentWindow = appCollection.list[index]
			this._focusWindow(currentWindow)
		}
	}

	_bindKeys() {
		this._config.forEach((bind, _) => {
			Main.wm.addKeybinding(
				bind.key,
				this._settings,
				Meta.KeyBindingFlags.NONE,
				Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
				() => this._launchOrSwitchApp(bind.app)
			)
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
