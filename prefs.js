'use strict';

import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GlaunchPreferences extends ExtensionPreferences {

	getVisibleApps() {
		let appList = Gio.AppInfo.get_all();
		let visibleApps = appList.filter(app => app.should_show());

		visibleApps.sort((a, b) => {
			return a.get_display_name().toLowerCase().localeCompare(
				b.get_display_name().toLowerCase()
			);
		});

		return visibleApps;
	}

	getPreferencesWidget() {
		return new Gtk.Label({
			label: this.metadata.name,
		});
	}

	fillPreferencesWindow(window) {
		window._settings = this.getSettings('org.gnome.shell.extensions.glaunch');

		const page = new Adw.PreferencesPage({
			title: 'General',
			icon_name: 'dialog-information-symbolic',
		});

		const group = new Adw.PreferencesGroup({
			title: 'Appearance',
			description: 'Configure the appearance of the extension',
		});

		const row = new Adw.ActionRow({
			title: 'Show Indicator',
			subtitle: 'Whether to show the panel indicator',
		});

		// get visible apps
		const apps = this.getVisibleApps();
		const model = Gtk.StringList.new(
			apps.map(app => app.get_display_name())
		);

		const dropDown = new Gtk.DropDown({
			model: model,
			valign: Gtk.Align.CENTER,
		});

		row.add_suffix(dropDown);
		group.add(row)
		page.add(group)
		window.add(page)

	}

}
