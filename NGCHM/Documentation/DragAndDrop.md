# NG-CHM Viewer Drag-and-Drop Functionality

Users can add plugins to an NG-CHM Viewer at runtime by dragging a
plugin-specification and dropping it onto the NG-CHM Viewer near the hamburger
menu.  The drop target will highlight when a dragged item is above it.

Plugin specifications are JSON objects (e.g. from a file).  They must
have:
- a "type" field that equals "linkout.spec",
- a "kind" field of type string, and
- a "spec" field of type object.

Three kinds of plugins can be loaded:
- "panel-plugin" A plugin that displays in a user-interface panel.
- "linkout-plugin" A plugin that provides one or more link-out menu entries.
- "hamburger-plugin" A plugin that provides a hamburger menu entry.

## Common Spec Fields

The following fields are common to all three plugin types:

- "name" The name of the plugin as shown in menus, dialogs, etc.
- "src" The URL for the plugin page (HTML).
- "version" The current version of the plugin.
- "description" A long description of the plugin shown in some dialogs.
- "site" A URL for a website that describes the plugin.
- "logo" A URL for a logo for the plugin or website.

The "name" and "src" fields are required.

All three link-out types open a HTML document (loaded from "src") in an iframe within the NG-CHM viewer.
This iframe is shown in the panel for panel plugins and is hidden for link-out and hamburger plugins.

## Panel Plugins

The "kind" field of a panel plugin must equal "panel-plugin".

The "spec" object for a panel plugin must also include the "params" object for defining
the panel plugin gear menu (see the panel plugin documentation for details).

An example panel plugin specification:

    {
      "type": "linkout.spec",
      "kind": "panel-plugin",
      "spec": {
        "name": "<plugin name>",
        "description": "<plugin description>",
        "version": "<plugin version number>",
        "logo": "<url for plugin logo>",
        "site": "<url for plugin website>",
        "helpText": "<plugin help text>",
        "params": {}, 
        "src": "<plugin url>"
      }
    }

## Link-out Plugins

The "kind" field of a link-out plugin must equal "linkout-plugin".

The "spec" object for a link-out plugin must include two additional
arrays: "linkouts" and "matrixLinkouts".

Each element of the "linkouts"  array is an object describing an axis linkout, with the
following fields:
- "menuEntry" The name of the menu entry.
- "typeName" The type of label the menu entry applies to.
- "selectMode" Either "singleSelection" or "multiSelection".
- "messageId" Included in message sent to HTML page. Used to distinguish different menu items.

Each element of the "maxtrixLinkouts" array is an object describing a matrix linkout, with the
following fields:
- "menuEntry" The name of the menu entry.
- "typeName1" One type of label the menu entry applies to.
- "typeName2" The type of the other axis label the menu entry applies to.
- "selectMode" Either "singleSelection" or "multiSelection".
- "messageId" Included in the message sent to the HTML page. Used to distinguish different menu items in the same plugin.

## Hamburger Plugins

The "kind" field of a link-out plugin must equal "hamburger-plugin".

The "spec" object for a hamburger plugin must include the following additional fields:

- The "label" specifies the text to display in the hamburger menu.
- The "icon" field is a URL for an icon image to display beside the label in the hamburger menu.
- The "messageId" field is a string that is included in messages send to the plugin HTML page.

