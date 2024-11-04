import { App, Modal, Notice, Setting } from 'obsidian';

export class EditBookmarkModal extends Modal {
    private result: {
        title?: string;
        url?: string;
        description?: string;
        shortName?: string;
    } = {};

    private itemType: string;
    private initialTitle: string;
    private initialUrl: string;
    private guid: string;
    private onSave: (changes: Record<string, unknown>) => Promise<void>;
    private initialDescription: string;
    private initialShortName: string;
    
    constructor(
        app: App,
        itemType: string,
        initialTitle: string,
        initialUrl = '',
        initialDescription = '',
        initialShortName = '',
        guid: string,
        onSave: (changes: Record<string, unknown>) => Promise<void>
    ) {
        super(app);
        this.itemType = itemType;
        this.initialTitle = initialTitle;
        this.initialUrl = initialUrl;
        this.initialDescription = initialDescription;
        this.initialShortName = initialShortName;
        this.guid = guid;
        this.onSave = onSave;
        this.result.title = initialTitle;
        this.result.url = initialUrl;
        this.result.description = initialDescription;
        this.result.shortName = initialShortName;
    }

onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: `Edit ${this.itemType}` });

    switch (this.itemType) {
        case 'Bookmark':
            this.createBookmarkForm();
            break;
        case 'Bookmark Description':
        case 'Folder Description':
            this.createDescriptionForm();
            break;
        case 'Bookmark Short Name':
        case 'Folder Short Name':
            this.createShortNameForm();
            break;
        case 'Folder':
            this.createFolderForm();
            break;
    }

    new Setting(contentEl)
        .addButton((btn) =>
            btn
                .setButtonText('Close')
                .onClick(() => {
                    this.close();
                })
        )
        .addButton((btn) =>
            btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    try {
                        await this.onSave(this.result);
                        this.close();
                    } catch (error) {
                        new Notice('Error saving changes: ' + error.message);
                    }
                })
        );
}

private createBookmarkForm() {
    new Setting(this.contentEl)
        .setName('Title')
        .addText((text) =>
            text
                .setPlaceholder('Enter title')
                .setValue(this.initialTitle)
                .onChange((value) => {
                    this.result.title = value;
                })
        );

    new Setting(this.contentEl)
        .setName('URL')
        .addText((text) =>
            text
                .setPlaceholder('Enter URL')
                .setValue(this.initialUrl)
                .onChange((value) => {
                    this.result.url = value;
                })
        );

    new Setting(this.contentEl)
        .setName('Description')
        .addText((text) =>
            text
                .setPlaceholder('Enter description')
                .setValue(this.initialDescription)
                .onChange((value) => {
                    this.result.description = value;
                })
        );

    new Setting(this.contentEl)
        .setName('Short Name')
        .addText((text) =>
            text
                .setPlaceholder('Enter short name')
                .setValue(this.initialShortName)
                .onChange((value) => {
                    this.result.shortName = value;
                })
        );
}

    private createDescriptionForm() {
    new Setting(this.contentEl)
        .setName('Description')
        .addText((text) =>
            text
                .setPlaceholder('Enter description')
                .setValue(this.initialDescription)
                .onChange((value) => {
                    this.result.description = value;
                })
        );
}

private createShortNameForm() {
    new Setting(this.contentEl)
        .setName('Short Name')
        .addText((text) =>
            text
                .setPlaceholder('Enter short name')
                .setValue(this.initialShortName)
                .onChange((value) => {
                    this.result.shortName = value;
                })
        );
}

    private createFolderForm() {
        new Setting(this.contentEl)
            .setName('Folder Name')
            .addText((text) =>
                text
                    .setPlaceholder('Enter folder name')
                    .setValue(this.initialTitle)
                    .onChange((value) => {
                        this.result.title = value;
                    })
            );
    
        new Setting(this.contentEl)
            .setName('Description')
            .addText((text) =>
                text
                    .setPlaceholder('Enter description')
                    .setValue(this.initialDescription)
                    .onChange((value) => {
                        this.result.description = value;
                    })
            );
    
        new Setting(this.contentEl)
            .setName('Short Name')
            .addText((text) =>
                text
                    .setPlaceholder('Enter short name')
                    .setValue(this.initialShortName)
                    .onChange((value) => {
                        this.result.shortName = value;
                    })
            );
    }
}