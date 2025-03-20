# glaunch

A GNOME extension implementing efficient keyboard-driven application launching and window management inspired by Xah Lee's computing philosophy.

## Philosophy & Motivation

This project draws inspiration from [Xah Lee's critique of tiling window managers](http://xahlee.info/linux/why_tiling_window_manager_sucks.html) while addressing the need for efficient keyboard-based navigation in personal computing. Rather than replacing GNOME's window management entirely, glaunch enhances it with powerful keyboard shortcuts.

## Core Features

glaunch transforms your GNOME desktop experience through four key capabilities:

- **Application-Bound Function Keys**: Assign function keys to your most frequently used applications. Each key will either switch to an existing instance or launch a new one if none exists.

- **Window Cycling**: When already focused on an application, pressing its assigned key binding will cycle through all open windows of that application.

- **Smart Focus with Cursor Positioning**: When switching between different applications, glaunch automatically centers your cursor on the newly focused window for immediate interaction.

- **Last Window Recall**: Quickly toggle between your two most recently used windows with a single key binding, eliminating the need to remember which application you were using previously.

## Current Status

As of March 2025, glaunch is feature-complete but with some limitations:

- **Publication Status**: Not yet available in the GNOME Extensions store due to compatibility issues
- **Application Support**: Currently requires applications to be launchable via terminal commands from the system path (Flatpak applications not supported yet)
- **Roadmap**: Future versions will utilize .desktop files to overcome the Flatpak limitation and include additional code refinements

## Installation

1. Clone this repository into your GNOME extensions directory:
   `~/.local/share/gnome-shell/extensions/`
2. Create a conf file  `~/.config/glaunch/glaunch.conf`

## Sample Configuration file
**Note**: The `app_launch_other f12 other` binding designates F12 as a special key that will cycle through all applications that are not already bound to other function keys. This is useful for accessing less frequently used applications without needing to assign individual keys to each one.
```
app_launch_path f2 kitty
app_launch_path f3 obsidian
app_launch_path f9 vivaldi-stable
app_launch_path f10 emacs
app_launch_path f11 discord
app_launch_other f12 other

win_manage f4 previous⏎        
```
