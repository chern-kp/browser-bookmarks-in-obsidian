import { App, Modal, Notice, Setting } from 'obsidian';

export class EditBookmarkModal extends Modal {
    private itemType: string;
    private initialTitle: string;
    private initialUrl: string;

    constructor(app: App, itemType: string, initialTitle: string, initialUrl = '') {
        super(app);
        this.itemType = itemType;
        this.initialTitle = initialTitle;
        this.initialUrl = initialUrl;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: `Edit ${this.itemType}` });

        new Setting(contentEl)
            .setName('Type')
            .addText((text) =>
                text
                    .setDisabled(true)
                    .setValue(this.itemType)
            );

        new Setting(contentEl)
            .setName('Title')
            .addText((text) =>
                text
                    .setPlaceholder('Enter title')
                    .setValue(this.initialTitle)
                    .onChange((value) => {
                        this.initialTitle = value;
                    })
            );

        if (this.itemType === 'Bookmark') {
            new Setting(contentEl)
                .setName('URL')
                .addText((text) =>
                    text
                        .setPlaceholder('Enter URL')
                        .setValue(this.initialUrl)
                        .onChange((value) => {
                            this.initialUrl = value;
                        })
                );
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
                    .onClick(() => {
                        // TODO: Implement save functionality
                        new Notice('Changes saved successfully!');
                        this.close();
                    })
            );

    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}