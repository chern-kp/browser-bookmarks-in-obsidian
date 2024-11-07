import { App, Plugin, PluginSettingTab, Setting, MarkdownRenderer, MarkdownPostProcessorContext, Notice, setIcon } from 'obsidian';
import { MyPluginSettings, DEFAULT_SETTINGS } from './settings/settings';
import { VivaldiBookmarksFetcher } from './fetcher/VivaldiBookmarksFetcher';
import { EditBookmarkModal } from './EditBookmarkModal';
import { BookmarkNode, BookmarkType } from './fetcher/types';
import fs from 'fs';

interface BookmarkChanges {
    title?: string;
    url?: string;
    description?: string;
    shortName?: string;
}

interface BookmarkData {
    node: BookmarkNode;
    type: BookmarkType;
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    fileExists: boolean;
    bookmarksFetcher: VivaldiBookmarksFetcher | null = null;

    async onload() {
        await this.loadSettings();
        await this.initializeBookmarksFetcher();
        this.addSettingTab(new SettingTab(this.app, this));
        this.registerMarkdownProcessor();
    }

    private async initializeBookmarksFetcher(): Promise<void> {
        const filePath = this.settings.selectBookmarksFile;
        this.fileExists = fs.existsSync(filePath);
        
        if (this.fileExists) {
            this.bookmarksFetcher = new VivaldiBookmarksFetcher(filePath);
            await this.bookmarksFetcher.loadBookmarks();
        }
    }

    private registerMarkdownProcessor(): void {
        this.registerMarkdownCodeBlockProcessor("Bookmarks", async (source, el, ctx) => {
            el.addClass('browser-bookmarks-plugin');
            const options = this.parseBookmarkOptions(source);
            
            if (options.bigDescription) {
                el.setAttribute('data-big-description', 'true');
            }
            
            const containerEl = this.createBookmarksContainer(el);
            
            if (!this.isBookmarksDataAvailable()) {
                this.showNoDataMessage(containerEl);
                return;
            }
    
            await this.renderBookmarksContent(containerEl, options, ctx);
        });
    }

    private createBookmarksContainer(el: HTMLElement): HTMLElement {
        const containerEl = el.createEl('div', { cls: 'bookmarks-container' });
        this.createUpdateButton(containerEl);
        return containerEl;
    }

    private createUpdateButton(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createEl('div', { cls: 'bookmarks-header' });
        const updateButton = buttonContainer.createEl('button', {
            cls: 'bookmarks-update-button',
            attr: { 'aria-label': 'Update bookmarks' }
        });
        setIcon(updateButton, 'refresh-cw');
        this.setupUpdateButtonListener(updateButton, containerEl);
    }

    private setupUpdateButtonListener(updateButton: HTMLElement, containerEl: HTMLElement): void {
        updateButton.addEventListener('click', async () => {
            try {
                await this.bookmarksFetcher?.loadBookmarks();
                const contentEl = containerEl.querySelector('.bookmarks-content') as HTMLElement;
                if (contentEl) {
                    await this.refreshContent(contentEl);
                }
                new Notice('Bookmarks updated successfully!');
            } catch (error) {
                console.error('Error updating bookmarks:', error);
                new Notice('Error updating bookmarks');
            }
        });
    }

    private isBookmarksDataAvailable(): boolean {
        return !!(this.bookmarksFetcher && this.bookmarksFetcher.bookmarksData);
    }

    private showNoDataMessage(containerEl: HTMLElement): void {
        containerEl.createEl('div').setText('Bookmarks data not loaded.');
    }

    private parseBookmarkOptions(source: string) {
        return {
            rootFolder: this.parseRootFolder(source),
            isEditable: this.parseIsEditable(source),
            bigDescription: this.parseBigDescription(source)
        };
    }

    private async renderBookmarksContent(
        containerEl: HTMLElement,
        options: { rootFolder: string | null; isEditable: boolean; bigDescription: boolean },
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        const contentEl = containerEl.createEl('div', { cls: 'bookmarks-content' });
        await this.refreshContent(contentEl, options, ctx);
    }

    private async refreshContent(
        contentEl: HTMLElement,
        options?: { rootFolder: string | null; isEditable: boolean; bigDescription: boolean },
        ctx?: MarkdownPostProcessorContext
    ): Promise<void> {
        if (!this.bookmarksFetcher || !ctx) return;

        contentEl.empty();
        const markdown = this.bookmarksFetcher.generateBookmarkListMarkdown(
            this.bookmarksFetcher.bookmarksData?.roots.bookmark_bar.children || [],
            0,
            options?.rootFolder ?? null,
            options?.isEditable ?? false,
            options?.bigDescription ?? false
        );

        if (markdown) {
            await MarkdownRenderer.renderMarkdown(markdown, contentEl, ctx.sourcePath, this);
            if (options?.isEditable) {
                this.setupEditListeners(contentEl, options.rootFolder, ctx);
            }
        }
    }

    private setupEditListeners(
        el: HTMLElement,
        rootFolder: string | null,
        ctx: MarkdownPostProcessorContext
    ): void {
        el.querySelectorAll('.edit-icon').forEach((icon: Element) => {
            const iconElement = icon as HTMLElement;
            iconElement.addEventListener('click', async (event) => {
                const target = event.target as HTMLElement;
                const guid = target.getAttribute('data-guid');
                await this.handleEditClick(guid, rootFolder, el, ctx);
            });
        });
    }

    private async handleEditClick(
        guid: string | null,
        rootFolder: string | null,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        if (!guid || !this.bookmarksFetcher) return;

        const bookmarkData = this.bookmarksFetcher.getBookmarkByGuid(guid);
        if (!bookmarkData) return;

        const initialData = this.getInitialBookmarkData(bookmarkData);
        this.openEditModal(bookmarkData.type, initialData, guid, rootFolder, el, ctx);
    }

    private getInitialBookmarkData(bookmarkData: BookmarkData): BookmarkChanges {
        const { node, type } = bookmarkData;
        return {
            title: ['Bookmark Description', 'Bookmark Short Name', 'Folder Description', 'Folder Short Name'].includes(type) 
                ? undefined 
                : node.name,
            url: type === 'Bookmark' ? node.url : undefined,
            description: node.meta_info?.Description,
            shortName: node.meta_info?.Nickname
        };
    }

    private openEditModal(
        type: BookmarkType,
        initialData: BookmarkChanges,
        guid: string,
        rootFolder: string | null,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): void {
        new EditBookmarkModal(
            this.app,
            type,
            initialData.title ?? '',
            initialData.url ?? '',
            initialData.description ?? '',
            initialData.shortName ?? '',
            guid,
            async (changes: BookmarkChanges) => {
                await this.handleModalSave(changes, guid, rootFolder, el, ctx);
            }
        ).open();
    }

    private async handleModalSave(
        changes: BookmarkChanges,
        guid: string,
        rootFolder: string | null,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        try {
            await this.bookmarksFetcher?.saveBookmarkChanges(guid, changes);
            const containerEl = el.closest('.browser-bookmarks-plugin');
            const bigDescription = containerEl?.hasAttribute('data-big-description') ?? false;
            
            await this.refreshContent(el, { 
                rootFolder, 
                isEditable: true, 
                bigDescription 
            }, ctx);
            new Notice('Changes saved successfully!');
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error saving changes:', error);
                new Notice(`Error saving changes: ${error.message}`);
            }
        }
    }

    private parseRootFolder(source: string): string | null {
        const match = source.match(/RootFolder:\s*(.+)/);
        return match ? match[1].trim() : null;
    }

    private parseIsEditable(source: string): boolean {
        const match = source.match(/isEditable:\s*(true|false)/i);
        return match ? match[1].toLowerCase() === 'true' : false;
    }

    private parseBigDescription(source: string): boolean {
        const match = source.match(/bigDescription:\s*(true|false)/i);
        return match ? match[1].toLowerCase() === 'true' : false;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
    }
}

class SettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        this.createBrowserSetting(containerEl);
        this.createBookmarksFileSetting(containerEl);
    }

    private createBrowserSetting(containerEl: HTMLElement): void {
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
    }

    private createBookmarksFileSetting(containerEl: HTMLElement): void {
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