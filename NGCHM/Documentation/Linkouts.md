# Writing Linkouts

The NG-CHM linkout system provides linkouts from NG-CHMs and similar objects to relevant web resources.  Important considerations in the design of the linkout system include:

* Wherever possible, linkouts aren't specific to NG-CHMs but should be usable from any "source object" with roughly comparable features.

* Linkouts are not directly incorporated into NG-CHMs.  Available linkouts change over time, and can vary from site to site. An NG-CHM should not have to be rebuild/edited because the avalable linkouts changed.

## Accessing the Linkout API

`window.linkouts` provides the core API to the NG-CHM agnostic linkout functions.

## Linkout Categories

*Hamburger* linkouts are **marohrdanz: I think it would help readers if there was a brief description of what Hamburger linkouts are for**, and are visible to users in a global "Hamburger"-type menu. They are defined using `linkouts.addHamburgerLinkout`. **marohrdanz: as best as I can tell these are plugins that are under the main help menu, under 'About Plugins' button?**

*Panel* linkouts are **marohrdanz: I think it would help readers if there was a brief description of what Panel linkouts are for**, and are available to users in the panel drop-down menus. When selected, they display content in the panel iframe. They are defined using `linkouts.addPanePlugin`.

*Single-axis* linkouts are **marohrdanz: I think it would help readers if there was a brief description of what single-axis linkouts are for**, and are available to users on the row and column label menus.

*Two-axis* linkouts, aka *matrix linkouts*, **marohrdanz: I think it would help readers if there was a brief description of what Two-axis linkouts are for** are available to users in the Matrix Menu. 

Both Single-axis and Two-axis linkouts are defined using `linkouts.addPlugin`, and can be one of two subcategories: *single-label* linkouts, denoted by `linkouts.SINGLE_SELECT`, or *multiple-label* linkouts denoted by `linkouts.MULTI_SELECT`.  

Both Single-axis and Two-axis linkouts also require their linkout type (described directly below) to be specified.

## Linkout Types

Linkout types, possibly in conjunction with attributes, determine which axis linkouts are include in the menus.  Linkout types are simply strings, such as `bio.gene.hugo` which stands for HUGO gene symbols. Types beginning with "chm." are reserved for definition by the NG-CHM system.  Types beginning with "bio." are reserved for types in Biology.

## Attributes

Attributes are string values globally associated with the NG-CHM.  For instance, the `bio.species` attribute can be used to specify the species to which all data in the NG-CHM applies.

## Structure of a typical `custom.js` file

### Set version number

Call `linkouts.setVersion` to define the custom.js file version.  In NG-CHMs, the linkouts version is displayed with other version numbers in the About and Map Properties dialogs.

```javascript
linkouts.setVersion('1.0.0');
```

### Describe types

`linkouts.describeTypes` should be used to provide more information about the linkout types used in the custom.js file. For example:

```javascript
linkouts.describeTypes([
  { typeName: 'bio.gene.hugo',
    displayName: 'HUGO gene symbol',
    description: 'The official HUGO symbol for a gene',
    examples: 'TP53',
    format: 'Latin letters and Arabic numerals, usually without punctuation',
    },
  ]);
```

NG-CHMs currently don't display this additional type information. The NG-CHM Builder uses `displayName` in drop-down menus for selecting row and column types. We anticipate displaying and using more of this information in future releases.  In any case, it can be a handy reference for linkout developers.

### Specify type relations (optional)

You can specify that one type is a subtype of another, for instance:

```javascript
linkouts.addSubtype('bio.gene.hugo', 'bio.pubmed');
```

This specifies that `'bio.gene.hugo'` is a subtype of `'bio.pubmed'`. This means that pubmed linkouts automatically apply to labels that are specified as HUGO gene symbols.

### Specify Linkouts

Hamburger and label linkouts typically require helper functions. They should be enclosed in blocks or immediately-executed function expressions (IIFEs) to prevent pollution of the window namespace.

For example:
```javascript
(function (linkouts) {

    const baseURL = 'https://www.ncbi.nlm.nih.gov/';

    function openEntrezIdPage(entrezIds) {
        const id = entrezids[0];
        linkouts.openUrl(baseURL + 'gene/' + id, 'NCBI');
    }

    linkouts.addPlugin({
        name: 'NCBI',
        description: 'Adds linkout to NCBI',
        version: '0.0.1',
        site: baseURL,
        logo: baseURL + 'portal/portal3rc.fcgi/4013172/img/3242381',
        linkouts: [
            { menuEntry: 'View NCBI Entrez ID',
              typeName: 'bio.gene.entrezid',
              selectMode: linkouts.SINGLE_SELECT,
              linkoutFn: openEntrezIdPage,
            },
          ],
      });
}) (linkouts);
```
The linkout will be added to the row label menu if the rows are identifed as Entrez identifiers, and/or to the column label menu if the columns are identified as Entrez identifiers.

There is an additional parameter for matrix menu entries. See `linkouts.addPlugin` for details.

## Linkouts API

### Constants

#### `linkouts.SINGLE_SELECT`

Specifies a linkout that accepts a single label.

#### `linkouts.MULTI_SELECT`

Specifies a linkout that accepts one or more labels.

### Functions

#### `linkouts.addHamburgerLinkout`

Adds the hamburger linkout specified by params.

```javascript
linkouts.addHamburgerLinkout(params);
```

params is an object with the following fields:
<dl>
<dt>name</dt><dd>Internal name of the linkout</dd>
<dt>label</dt><dd>Shown in menu entries etc.</dd>
<dt>icon</dt><dd>URL for a small image (icon) to show in the menu entry</dd>
<dt>action</dt><dd>Function executed when the plugin is selected. No arguments are passed to the function.</dd>
</dl>

#### `linkouts.addLinkout`
Prefer using `linkouts.addPlugin` over this function.

Adds one axis-label linkout specified by by the parameters.

```javascript
linkouts.addLinkout(name, labelType, selectType, callback, reqAttributes);
```

Parameters:
<dl>
<dt>name:</dt><dd>Name of the linkout (a string). Used in menus etc.</dd>
<dt>labelType:</dt><dd>Type of labels accepted (a string).</dd>
<dt>selectType</dt><dd>Either `linkouts.SINGLE_SELECT` or `linkouts.MULTI_SELECT`</dd>
<dt>callback:</dt><dd>Function called when the linkout is selected. It is passed a string array. If `selectType == linkouts.SINGLE_SELECT` the array will contain one element.</dd>
<dt>reqAttributes:</dt><dd>An array of attributes (strings) that this linkout requires. Defaults to none.</dd>
</dl>

#### `linkouts.addMatrixLinkout`
Prefer using `linkouts.addPlugin` over this function.

Adds one matrix linkout specified by the parameters.

```javascript
linkouts.addMatrixLinkout(name, rowType, colType, selectType, callback, reqAttributes);
```

Parameters:
<dl>
<dt>name:</dt><dd>Name of the linkout (a string). Used in menus etc.</dd>
<dt>rowType:</dt><dd>Type of row labels accepted (a string).</dd>
<dt>colType:</dt><dd>Type of column labels accepted (a string).</dd>
<dt>selectType</dt><dd>Either `linkouts.SINGLE_SELECT` or `linkouts.MULTI_SELECT`</dd>
<dt>callback:</dt><dd>Function called when the linkout is selected. It is passed an object with two entries (`Row` and `Column`), each of which is an array of strings. If `selectType == linkouts.SINGLE_SELECT`, each array will contain one element.</dd>
<dt>reqAttributes:</dt><dd>An array of attributes (strings) that this linkout requires. Defaults to none.</dd>
</dl>

#### `linkouts.addPanePlugin`
Add the panel plugin specified by plugin.

```javascript
linkouts.addPanePlugin(plugin);
```

plugin is an object with the following fields:
<dl>
<dt>name:</dt><dd>Name of the plugin (a string). Used in menus etc.</dd>
<dt>helpText:</dt><dd>Brief help text. Used in tooltips etc.</dd>
<dt>src:</dt><dd>URL of page to open in the panel. Page must implement the panel plugin protocol.</dd>
<dt>params</dt><dd>An object specifying the panel's parameters. To be documented.</dd>
</dl>

#### `linkouts.addPlugin`
Either adds the plugin specified by plugin or replaces an existng plugin with the same name.

```javascript
linkouts.addPlugin(plugin);
```

plugins is an object with the following fields:
<dl>
<dt>name</dt><dd>The plugin's name</dd>
<dt>description</dt><dd>A short description of the plugin.</dd>
<dt>version:</dt><dd>Version of the plugin.</dd>
<dt>site:</dt><dd>URL for site related to the plugin</dd>
<dt>logo:</dt><dd>URL for logo related to the plugin</dd>
<dt>linkouts:</dt><dd>An array of axis linkouts. See below.</dd>
<dt>matrixLinkouts:</dt><dd>An array of matrix linkouts. See below.</dd>
</dl>
Each element of the linkouts field is an object with the following fields:
<dl>
<dt>menuEntry</dt><dd>Menu entry for the linkout.</dd>
<dt>typeName</dt><dd>Type of labels expected by the linkout.</dd>
<dt>selectMode</dt><dd>Either `linkouts.SINGLE_SELECT` or `linkouts.MULTI_SELECT`</dd>
<dt>linkoutFn</dt><dd>Function called when the linkout is selected. It is passed a string array. If `selectType == linkouts.SINGLE_SELECT` the array will contain one element.</dd>
<dt>attributes:</dt><dd>An array of attributes (strings) that this linkout requires. Defaults to none.</dd>
</dl>
Each element of the matrixLinkouts field is an object with the following fields:
<dl>
<dt>menuEntry</dt><dd>Menu entry for the linkout.</dd>
<dt>typeName1</dt><dd>Type of labels on one axis expected by the linkout.</dd>
<dt>typeName2</dt><dd>Type of labels on the other axis expected by the linkout.</dd>
<dt>selectMode</dt><dd>Either `linkouts.SINGLE_SELECT` or `linkouts.MULTI_SELECT`</dd>
<dt>linkoutFn</dt><dd>Function called when the linkout is selected. It is passed an object with two entries (`Row` and `Column`), each of which is an array of strings. If `selectType == linkouts.SINGLE_SELECT`, each array will contain one element.</dd>
<dt>attributes:</dt><dd>An array of attributes (strings) that this linkout requires. Defaults to none.</dd>
</dl>

#### `linkouts.describeTypes`
Describe an array of type strings.

```javascript
linkouts.describeTypes(typearray);
```

`typearray` is an array of objects, each of which includes the following fields:
<dl>
<dt>typeName:</dt><dd>The type (a string).</dd>
<dt>displayName:</dt><dd>Display name for the type. Used in menus etc.</dd>
<dt>description:</dt><dd>A longer description of the type.</dd>
<dt>examples:</dt><dd>One or more example values.</dd>
<dt>format</dt><dd>A description of the format of acceptable values of the type.</dd>
</dl>

#### `linkouts.getAttribute`
Returns the value of the global attribute specified by attribute (a string).
Returns undefined if no such attribute is defined.

```javascript
const value = linkouts.getAttribute(attribute);
```

#### `linkouts.getMapFileName`
Returns the name of the file or other resource from which the NG-CHM or other source object was loaded. May or may not resemble the map's name.

```javascript
const fileName = linkouts.getMapFileName();
```

#### `linkouts.getMapName`
Returns the name of the NG-CHM or other source object.

```javascript
const name = linkouts.getMapName();
```

#### `linkouts.getSourceObjectType`
Returns the type (a string) of the source object. Returns `'chm'` for NG-CHMs.

```javascript
const objectType = linkouts.getSourceObjectType();
```

#### `linkouts.getSourceObjectUniqueId`
Returns a unique identifier (a string) for the source object.

```javascript
const uniqueId = linkouts.getSourceObjectUniqueId();
```

#### `linkouts.getVersion`
Returns the version string of the linkouts file (as set by `linkouts.setVersion`)

```javascript
const version = linkouts.getVersion();
```

#### `linkouts.openUrl`
Opens the specified URL. If a linkouts panel is open, it will be opened in an iframe in that panel.  Otherwise it will be opened in a (new) window called name.

```javascript
linkouts.openUrl(URL, name, options)
```

options is an object with the following optional field:
<dl>
<dt>noframe:</dt><dd>If truthy, do not open in a linkout panel. Needed for sites that do not permit being opened in an iframe.
</dl>

#### `linkouts.setVersion`
Sets the version string of the linkouts file to version (a string).  If called multiple times, the additonal calls simply overwrite previous versions.

```javascript
linkouts.setVersion(version);
```

#### `linkouts.simplifyLabels`
Combines the unique labels from the `Row` and `Column` entries of `labels` into a single string array.

```javascript
const allLabels = linkouts.simplifyLabels(labels);
```

