import { App, Plugin, PluginSettingTab, Setting, MarkdownRenderer, MarkdownPostProcessorContext, Notice, setIcon } from 'obsidian';
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
            el.addClass('browser-bookmarks-plugin');            
            const containerEl = el.createEl('div', { cls: 'bookmarks-container' });

            const buttonContainer = containerEl.createEl('div', {
                cls: 'bookmarks-header' 
            });

            const updateButton = buttonContainer.createEl('button', {
                cls: 'bookmarks-update-button', 
                attr: { 'aria-label': 'Update bookmarks' }
            });
            setIcon(updateButton, 'refresh-cw');

            if (!this.bookmarksFetcher || !this.bookmarksFetcher.bookmarksData) {
                containerEl.createEl('div').setText('Bookmarks data not loaded.');
                return;
            }

            const rootFolder = this.parseRootFolder(source);
            const isEditable = this.parseIsEditable(source);

            updateButton.addEventListener('click', async () => {
                try {
                    await this.bookmarksFetcher?.loadBookmarks();
                    await renderContent();
                    new Notice('Bookmarks updated successfully!');
                } catch (error) {
                    console.error('Error updating bookmarks:', error);
                    new Notice('Error updating bookmarks');
                }
            });

            const contentEl = containerEl.createEl('div', { cls: 'bookmarks-content' });

            const renderContent = async () => {
                contentEl.empty();
                const markdown = this.bookmarksFetcher?.generateBookmarkListMarkdown(
                    this.bookmarksFetcher.bookmarksData?.roots.bookmark_bar.children || [],
                    0,
                    rootFolder,
                    isEditable
                );

                if (markdown) {
                    await MarkdownRenderer.renderMarkdown(markdown, contentEl, ctx.sourcePath, this);
                    this.setupEditListeners(contentEl, isEditable, rootFolder, ctx);
                }
            };

            await renderContent();
        });
    }

    private setupEditListeners(el: HTMLElement, isEditable: boolean, rootFolder: string | null, ctx: MarkdownPostProcessorContext) {
        if (!isEditable) return;

        el.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', async (event) => {
                const target = event.target as HTMLElement;
                const guid = target.getAttribute('data-guid');

                if (!guid || !this.bookmarksFetcher) return;

                const bookmarkData = this.bookmarksFetcher.getBookmarkByGuid(guid);
                if (!bookmarkData) return;

                const { node, type } = bookmarkData;
                let initialTitle = '';
                let initialUrl = '';
                let initialDescription = '';
                let initialShortName = '';
                
                switch (type) {
                    case 'Bookmark':
                        initialTitle = node.name;
                        initialUrl = node.url || '';
                        initialDescription = node.meta_info?.Description || '';
                        initialShortName = node.meta_info?.Nickname || '';
                        break;
                    case 'Folder':
                        initialTitle = node.name;
                        initialDescription = node.meta_info?.Description || '';
                        initialShortName = node.meta_info?.Nickname || '';
                        break;
                    case 'Bookmark Description':
                    case 'Folder Description':
                        initialDescription = node.meta_info?.Description || '';
                        break;
                    case 'Bookmark Short Name':
                    case 'Folder Short Name':
                        initialShortName = node.meta_info?.Nickname || '';
                        break;
                }

                new EditBookmarkModal(
                    this.app,
                    type,
                    initialTitle,
                    initialUrl,
                    initialDescription,
                    initialShortName,
                    guid,
                    async (changes) => {
                        try {
                            await this.bookmarksFetcher?.saveBookmarkChanges(guid, changes);
                            const markdown = this.bookmarksFetcher?.generateBookmarkListMarkdown(
                                this.bookmarksFetcher.bookmarksData?.roots.bookmark_bar.children || [],
                                0,
                                rootFolder,
                                isEditable
                            );
                
                            el.empty();
                            if (markdown) {
                                await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, this);
                                this.setupEditListeners(el, isEditable, rootFolder, ctx);
                            }
                
                            new Notice('Changes saved successfully!');
                        } catch (error) {
                            console.error('Error saving changes:', error);
                            new Notice(`Error saving changes: ${error.message}`);
                        }
                    }
                ).open();
            });
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

