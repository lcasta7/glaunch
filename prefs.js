'use strict';

import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GlaunchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'Glaunch',
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });

        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: 'Custom Shortcuts',
            description: 'Add and configure custom shortcuts',
        });

        // Create a list box for shortcuts
        this._listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });

        // Add button row
        const addButtonRow = new Adw.ActionRow({
            title: 'Add Custom Shortcut',
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
        });

        addButton.connect('clicked', () => {
            this._addNewShortcut();
        });

        addButtonRow.add_suffix(addButton);
        this._listBox.append(addButtonRow);

        // Add the list box to the group
        group.add(this._listBox);

        // Add the group to the page
        page.add(group);

        // Add the page to the window
        window.add(page);

        // Load existing shortcuts
        this._loadShortcuts();
    }

    _addNewShortcut() {
        const row = new Adw.ActionRow({
            title: 'New Shortcut',
        });

        // Command entry
        const commandEntry = new Gtk.Entry({
            placeholder_text: 'Enter command',
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });

        // Shortcut button
        const shortcutButton = new Gtk.Button({
            label: 'Set Shortcut',
            valign: Gtk.Align.CENTER,
        });

        // Remove button
        const removeButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
        });

        removeButton.connect('clicked', () => {
            row.get_parent().remove(row);
            this._saveShortcuts();
        });

        // Add widgets to row
        row.add_suffix(commandEntry);
        row.add_suffix(shortcutButton);
        row.add_suffix(removeButton);

        // Add shortcut capture functionality
        shortcutButton.connect('clicked', () => {
            const dialog = new ShortcutDialog(window);
            dialog.connect('response', (dialog, response) => {
                if (response === Gtk.ResponseType.OK) {
                    const accelerator = dialog.get_accelerator();
                    shortcutButton.set_label(accelerator || 'Set Shortcut');
                    this._saveShortcuts();
                }
                dialog.destroy();
            });
            dialog.show();
        });

        // Add the row to the list box
        this._listBox.append(row);
    }

    _loadShortcuts() {
        // Load shortcuts from settings
        const settings = this.getSettings();
        const shortcuts = settings.get_strv('shortcuts') || [];

        shortcuts.forEach(shortcutString => {
            const [command, accelerator] = shortcutString.split('::');
            this._addShortcutRow(command, accelerator);
        });
    }

    _saveShortcuts() {
        const shortcuts = [];
        let child = this._listBox.get_first_child();

        while (child) {
            if (child instanceof Adw.ActionRow && child.get_title() !== 'Add Custom Shortcut') {
                const command = child.get_children()[0].get_text();
                const accelerator = child.get_children()[1].get_label();
                if (command && accelerator !== 'Set Shortcut') {
                    shortcuts.push(`${command}::${accelerator}`);
                }
            }
            child = child.get_next_sibling();
        }

        const settings = this.getSettings();
        settings.set_strv('shortcuts', shortcuts);
    }

    _addShortcutRow(command, accelerator) {
        const row = new Adw.ActionRow({
            title: command || 'New Shortcut',
        });

        // Add existing command and shortcut
        const commandEntry = new Gtk.Entry({
            text: command,
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });

        const shortcutButton = new Gtk.Button({
            label: accelerator || 'Set Shortcut',
            valign: Gtk.Align.CENTER,
        });

        const removeButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
        });

        row.add_suffix(commandEntry);
        row.add_suffix(shortcutButton);
        row.add_suffix(removeButton);

        this._listBox.append(row);
    }
}

// Shortcut capture dialog
const ShortcutDialog = GObject.registerClass(
    class ShortcutDialog extends Gtk.Dialog {
        _init(parent) {
            super._init({
                title: 'Set Shortcut',
                transient_for: parent,
                use_header_bar: true,
                modal: true,
            });

            this._accelerator = '';

            const content = this.get_content_area();
            const label = new Gtk.Label({
                label: 'Press a key combination to set as shortcut',
                margin_top: 12,
                margin_bottom: 12,
                margin_start: 12,
                margin_end: 12,
            });

            content.append(label);

            this.add_button('Cancel', Gtk.ResponseType.CANCEL);
            this.add_button('Set', Gtk.ResponseType.OK);

            this.connect('key-press-event', this._onKeyPress.bind(this));
        }

        get_accelerator() {
            return this._accelerator;
        }

        _onKeyPress(widget, event) {
            this._accelerator = Gtk.accelerator_name(
                event.get_keyval()[1],
                event.get_state()[1]
            );
            return Gdk.EVENT_STOP;
        }
    }
);