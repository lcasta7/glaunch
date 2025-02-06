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
			this._apps = new Map();
			this._boundedApps = new Set(["vivaldi-stable", "kitty", "emacs", "obsidian"]);
			this._bindKeys();


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

		log(`DEBUG_MYAPP: _launch called with appName=${appName}`);
		let focusedWindow = global.display.focus_window;

		//if we're currently on the same type of app - switch
		log(`DEBUG_MYAPP: _launch called with focusedWindow=${focusedWindow}`);
		if (focusedWindow
			&& (focusedWindow.get_wm_class_instance() === appName
				|| !this._boundedApps.has(focusedWindow.get_wm_class_instance()))
			&& this._apps.has(appName)
			&& this._apps.get(appName).list.length > 1) {

			log('DEBUG_MYAPP: _launch switching between apps');
			let appCollection = this._apps.get(appName)
			appCollection.index = ++appCollection.index % appCollection.list.length

			let nextWindow = appCollection.list[appCollection.index]
			this._focusWindow(nextWindow)
		} else if (this._apps.has(appName)) { //switch to the app

			log('DEBUG_MYAPP: _launch switching to app');
			let appCollection = this._apps.get(appName)
			let index = appCollection.index % appCollection.list.length

			log(`DEBUG_MYAPP: _launch switching to app index=${index}`);

			let currentWindow = appCollection.list[index]
			this._focusWindow(currentWindow)
		} else { //launch app
			log('DEBUG_MYAPP: _launch launching app');
			this._apps.set()
			const app = Gio.AppInfo.create_from_commandline(appName, null, Gio.AppInfoCreateFlags.NONE);
			app.launch([], null);
		}
	}


	_bindKeys() {

		// f9
		Main.wm.addKeybinding(
			'launch-browser',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("vivaldi-stable")
		);

		// f2
		Main.wm.addKeybinding(
			'launch-terminal',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("kitty")
		);

		// f10
		Main.wm.addKeybinding(
			'launch-emacs',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("emacs")
		);

		// f3
		Main.wm.addKeybinding(
			'launch-obsidian',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("obsidian")
		);

		// f4
		Main.wm.addKeybinding(
			'launch-other',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("other")
		);
	}

	disable() {
		Main.wm.removeKeybinding('launch-terminal');
		Main.wm.removeKeybinding('launch-browser');
		Main.wm.removeKeybinding('launch-emacs');
		Main.wm.removeKeybinding('launch-obsidian');
		Main.wm.removeKeybinding('launch-other');

		if (this._settings) {
			this._settings.run_dispose();
			this._settings = null;
		}
	}
}
