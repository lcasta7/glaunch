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

		// create a factory for the icons
		const factory = new Gtk.SignalListItemFactory();
		factory.connect('setup', (factory, item) => {
			const box = new Gtk.Box({
				spacing: 10,
				orientation: Gtk.Orientation.HORIZONTAL,
			});
			const icon = new Gtk.Image({
				pixel_size: 16
			});
			const label = new Gtk.Label({
				xalign: 0
			});

			box.append(icon);
			box.append(label);
			item.set_child(box);
		});

		factory.connect('bind', (factory, item) => {
			const box = item.get_child();
			const icon = box.get_first_child();
			const label = icon.get_next_sibling();
			const app = apps[item.get_position()];

			icon.set_from_gicon(app.get_icon());
			label.set_label(app.get_display_name());
		});


		const dropDown = new Gtk.DropDown({
			model: new Gtk.StringList({
				strings: apps.map(app => app.get_display_name())
			}),
			factory: factory,
			valign: Gtk.Align.CENTER,
		});

		// stores the array of AppInfo objects as a custom property
		dropDown._apps = apps;

		row.add_suffix(dropDown);
		group.add(row)
		page.add(group)
		window.add(page)

	}

}
