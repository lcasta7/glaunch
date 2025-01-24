import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


// this will the values in the hashmap
// index: the index of the current window
// list: an array collection, we'll query it with the index
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
			this._bindKeys();


			global.window_manager.connect('map', (wm, actor) => {
				let metaWindow = actor.meta_window;
				this._storeApp(metaWindow);
			});


			global.window_manager.connect('destroy', (wm, actor) => {
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

	//name -> AppCollection
	_storeApp(metaWindow) {
		//here we want to store the new window in the map
		//looks like kitty is having trouble here
		log('DEBUG_MYAPP: _storeApp called');
		let appName = metaWindow.get_wm_class_instance();
		if (!appName || appName === 'gjs') return;
		if (metaWindow.window_type !== Meta.WindowType.NORMAL) return;


		let appCollection = this._apps.get(appName)
		if (this._apps.has(appName)) {
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

	//let's just take the name, and not the id for now
	//this is where the changes will go
	_launchOrSwitchApp(appName) {

		log(`DEBUG_MYAPP: _launch called with appName=${appName}`);
		// if the current window is an instance of appName,
		// cycle through the instances
		let focusedWindow = global.display.focus_window;

		log(`DEBUG_MYAPP: _launch called with focusedWindow=${focusedWindow}`);
		if (focusedWindow
			&& focusedWindow.get_wm_class_instance() === appName
			&& this._apps.has(appName)
			&& this._apps.get(appName).list.length > 1) {

			log('DEBUG_MYAPP: _launch switching between apps');
			let appCollection = this._apps.get(appName)
			appCollection.index = ++appCollection.index % appCollection.list.length

			let nextWindow = appCollection.list[appCollection.index]
			nextWindow.activate(global.get_current_time())
			this._centerMouseOnWindow(nextWindow)
			return
		}



		// if the collection already has the app
		if (this._apps.has(appName)) {

			log('DEBUG_MYAPP: _launch switching to app');
			let appCollection = this._apps.get(appName)
			let index = appCollection.index % appCollection.list.length

			log(`DEBUG_MYAPP: _launch switching to app index=${index}`);

			let currentWindow = appCollection.list[index]
			currentWindow.activate(global.get_current_time())
			this._centerMouseOnWindow(currentWindow)
			return
		} else {
			log('DEBUG_MYAPP: _launch launching app');
			this._apps.set()
			const app = Gio.AppInfo.create_from_commandline(appName, null, Gio.AppInfoCreateFlags.NONE);
			app.launch([], null);
			return
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
	}

	disable() {
		Main.wm.removeKeybinding('launch-terminal');
		Main.wm.removeKeybinding('launch-browser');
		Main.wm.removeKeybinding('launch-emacs');
		Main.wm.removeKeybinding('launch-obsidian');

		if (this._settings) {
			this._settings.run_dispose();
			this._settings = null;
		}
	}
}
