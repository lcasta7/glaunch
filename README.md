# glaunch
repo for my glaunch project

# launching an app
gio is the preferred library for gnome shell development
https://docs.gtk.org/gio/method.AppInfo.launch.html
https://docs.gtk.org/gio/type_func.AppInfo.create_from_commandline.html

```
gboolean
g_app_info_launch (
  GAppInfo* appinfo,
  GList* files, - can be null
  GAppLaunchContext* context, - can be null
  GError** error - can be null
)
```
