import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class Glaunch extends Extension {

	enable() {
		try {
			this._settings = this.getSettings();
			this._bindKeys();
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

	//let's just take the name, and not the id for now
	_launchOrSwitchApp(appName) {

		// if the list has the appName, take that id
		let windows = global.get_window_actors();
		let targetWindow = windows.find(w => {
			let metaWindow = w.get_meta_window();
			return metaWindow.get_wm_class_instance() === appName;
		});

		//if the id is not null, switch to the app
		if (targetWindow) {
			let metaWindow = targetWindow.get_meta_window();
			metaWindow.activate(global.get_current_time());
			this._centerMouseOnWindow(metaWindow);
			return;
		}
		//if it is, launch the app
		const app = Gio.AppInfo.create_from_commandline(appName, null, Gio.AppInfoCreateFlags.NONE);
		app.launch([], null);
	}


	_bindKeys() {
		Main.wm.addKeybinding(
			'launch-browser',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("vivaldi-stable")
		);

		Main.wm.addKeybinding(
			'launch-terminal',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("kitty")
		);

		Main.wm.addKeybinding(
			'launch-emacs',
			this._settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			() => this._launchOrSwitchApp("emacs")
		);

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

		if (this._settings) {
			this._settings.run_dispose();
			this._settings = null;
		}
	}
}
