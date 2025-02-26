# Browser Bookmarks is Obsidian
`Browser Bookmarks is Obsidian` is an Obsidian plugin that allows you to import and integrate your browser bookmarks directly into your notes.

**In early development. Currently only Vivaldi browser is supported.**
## Usage
### Configuration
After installing the plugin, you need to configure it to work with your browser:

1. Go to Settings > Browser Bookmarks in Obsidian
2. Select your browser from the dropdown menu (Chrome, Vivaldi, etc.)
3. Specify the path to your browser's bookmarks file:
    - For Chrome: Usually located in `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks`
    - For Vivaldi: Usually located in `%LOCALAPPDATA%\Vivaldi\User Data\Default\Bookmarks`
### Creating Bookmark Lists in Notes
Create a code block with the language set to `Bookmarks` to display your imported bookmarks inside note.
**To set code block language in Obsidian, you should specify it after the three backticks (```)**

Inside code block you can write additional options.

**Example of code block:**
```
isEditable: false
RootFolder: Bookmarks
bigDescription: false
```
#### Available Options

| Option           | Values                     | Description                                                      |
| ---------------- | -------------------------- | ---------------------------------------------------------------- |
| `isEditable`     | `true` / `false` (default) | Enables edit icons next to each bookmark for quick modifications |
| `RootFolder`     | `{folder name}`            | Specifies which bookmark folder to display                       |
| `bigDescription` | `true` / `false` (default) | Shows multi-line descriptions for bookmarks                      |
### Examples
**Basic Bookmark List**
```
RootFolder: Development
```

#### Editable Bookmark List with Extended Descriptions
```
isEditable: true
RootFolder: Research
bigDescription: true
```

## Installation
Install the BRAT Plugin from Obsidian Community Plugins or from the [GitHub repository](https://github.com/TfTHacker/obsidian42-brat).

1. Navigate to Settings > BRAT > Beta Plugin List
2. Click "Add Beta plugin"
3. Enter `https://github.com/chern-kp/JustAnotherHotkeyPlugin`
4. Click "Add Plugin"
5. Enable the plugin to begin using it

## Updating the Plugin
Update the plugin by either:
- Using the BRAT command `Check for updates to all beta plugins and UPDATE`
- Using the BRAT settings panel in Obsidian

## Support
**Careful:** This plugin is in very early development.