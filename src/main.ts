import { App, Plugin, PluginSettingTab, Setting, MarkdownRenderer } from 'obsidian';
import { MyPluginSettings, DEFAULT_SETTINGS } from './settings/settings';
import { VivaldiBookmarksFetcher } from './fetcher/VivaldiBookmarksFetcher'; // Adjust the path based on your file structure
import { EditBookmarkModal } from './EditBookmarkModal';
import fs from 'fs';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    fileExists: boolean;
    bookmarksFetcher: VivaldiBookmarksFetcher | null = null;

    async onload() {
        await this.loadSettings();

        //! Parse and traverse bookmarks if file exists
        const filePath = this.settings.selectBookmarksFile;
        const fileExists = fs.existsSync(filePath);
        this.fileExists = fileExists;
        if (fileExists) {
            this.bookmarksFetcher = new VivaldiBookmarksFetcher(filePath);
            await this.bookmarksFetcher.loadBookmarks();
        }

        this.addSettingTab(new SettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        // ! "Bookmark" code block


        this.registerMarkdownCodeBlockProcessor("Bookmarks", async (source, el, ctx) => {
            if (!this.bookmarksFetcher || !this.bookmarksFetcher.bookmarksData) {
                el.createEl('div').setText('Bookmarks data not loaded.');
                return;
            }

            const rootFolder = this.parseRootFolder(source);
            const isEditable = this.parseIsEditable(source);
            const markdown = this.bookmarksFetcher.generateBookmarkListMarkdown(
                this.bookmarksFetcher.bookmarksData.roots.bookmark_bar.children || [],
                0,
                rootFolder,
                isEditable
            );

            await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, this);

            if (isEditable) {
                el.querySelectorAll('.edit-icon').forEach(icon => {
                    icon.addEventListener('click', (event) => {
                        const target = event.target as HTMLElement;
                        const parentElement = target.parentElement;

                        if (parentElement) {
                            let itemType = '';
                            let initialTitle = '';
                            let initialUrl = '';

                            const boldElement = parentElement.querySelector('strong, b');
                            if (boldElement) {
                                itemType = 'Folder';
                                initialTitle = boldElement.textContent?.trim() || '';
                            }
                            else {
                                const linkElement = parentElement.querySelector('a');
                                if (linkElement) {
                                    itemType = 'Bookmark';
                                    initialTitle = linkElement.textContent?.trim() || '';
                                    initialUrl = linkElement.getAttribute('href') || '';
                                }
                            }
                            if (parentElement.textContent?.startsWith('Description:')) {
                                itemType = 'Description';
                                initialTitle = parentElement.textContent.replace('Description:', '').trim();
                            }
                            else if (parentElement.textContent?.startsWith('Short Name:')) {
                                itemType = 'Short Name';
                                initialTitle = parentElement.textContent.replace('Short Name:', '').trim();
                            }

                            new EditBookmarkModal(this.app, itemType, initialTitle, initialUrl).open();
                        }
                    });
                });
            }
        });
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private parseRootFolder(source: string): string | null {
        const match = source.match(/RootFolder:\s*(.+)/);
        return match ? match[1].trim() : null;
    }

    private parseIsEditable(source: string): boolean {
        const match = source.match(/isEditable:\s*(true|false)/i);
        return match ? match[1].toLowerCase() === 'true' : false;
    }
}

// ! Settings Tab
class SettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // ! New setting for the file path
        new Setting(containerEl)
            .setName('Select Bookmarks File')
            .setDesc('Select a local file for bookmarks.')
            .addText(text => text
                .setPlaceholder('Enter the path to your file')
                .setValue(this.plugin.settings.selectBookmarksFile)
                .onChange(async (value) => {
                    this.plugin.settings.selectBookmarksFile = value;
                    await this.plugin.saveSettings();
                }));
    }
}
