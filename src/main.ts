import { App, Plugin, PluginSettingTab, Setting, MarkdownRenderer } from 'obsidian';
import { MyPluginSettings, DEFAULT_SETTINGS } from './settings/settings';
import { VivaldiBookmarksFetcher } from './fetcher/VivaldiBookmarksFetcher';
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
                        const guid = target.getAttribute('data-guid');
                        if (guid && this.bookmarksFetcher) {
                            const bookmarkData = this.bookmarksFetcher.getBookmarkByGuid(guid);
                            if (bookmarkData) {
                                const { node, type } = bookmarkData;
            
                                let initialTitle = '';
                                let initialUrl = '';
            
                                switch (type) {
                                    case 'Bookmark':
                                        initialTitle = node.name;
                                        initialUrl = node.url || '';
                                        break;
                                    case 'Bookmark Description':
                                        initialTitle = node.meta_info?.Description || '';
                                        break;
                                    case 'Bookmark Short Name':
                                        initialTitle = node.meta_info?.Nickname || '';
                                        break;
                                    case 'Folder':
                                        initialTitle = node.name;
                                        break;
                                    case 'Folder Description':
                                        initialTitle = node.meta_info?.Description || '';
                                        break;
                                    case 'Folder Short Name':
                                        initialTitle = node.meta_info?.Nickname || '';
                                        break;
                                }
            
                                new EditBookmarkModal(this.app, type, initialTitle, initialUrl).open();
                            }
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

        new Setting(containerEl)
            .setName('Browser')
            .setDesc('Select the browser for bookmarks.')
            .addDropdown(dropdown => dropdown
                .addOption('Chrome', 'Chrome')
                .addOption('Vivaldi', 'Vivaldi')
                .setValue(this.plugin.settings.browser)
                .onChange(async (value: 'Chrome' | 'Vivaldi') => {
                    this.plugin.settings.browser = value;
                    await this.plugin.saveSettings();
                }));
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
