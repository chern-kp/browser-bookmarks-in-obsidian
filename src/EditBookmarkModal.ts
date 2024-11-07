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
        this.onSave = onSave;
        this.result.title = initialTitle;
        this.result.url = initialUrl;
        this.result.description = initialDescription;
        this.result.shortName = initialShortName;
    }

    onOpen() {
        this.createTitle();
        this.createForm();
        this.createFooterButtons();
    }

    private createTitle() {
        this.contentEl.createEl('h2', { text: `Edit ${this.itemType}` });
    }

    private createForm() {
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
    }

    private createFooterButtons() {
        new Setting(this.contentEl)
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
                    .onClick(() => this.handleSave())
            );
    }

    private async handleSave() {
        try {
            await this.onSave(this.result);
            this.close();
        } catch (error) {
            new Notice('Error saving changes: ' + (error as Error).message);
        }
    }

    private createBookmarkForm() {
        this.createTextSetting('Title', 'Enter title', this.initialTitle, (value) => {
            this.result.title = value;
        });

        this.createTextSetting('URL', 'Enter URL', this.initialUrl, (value) => {
            this.result.url = value;
        });

        this.createTextSetting('Description', 'Enter description', this.initialDescription, (value) => {
            this.result.description = value;
        });

        this.createTextSetting('Short Name', 'Enter short name', this.initialShortName, (value) => {
            this.result.shortName = value;
        });
    }

    private createDescriptionForm() {
        this.createTextSetting('Description', 'Enter description', this.initialDescription, (value) => {
            this.result.description = value;
        });
    }

    private createShortNameForm() {
        this.createTextSetting('Short Name', 'Enter short name', this.initialShortName, (value) => {
            this.result.shortName = value;
        });
    }

    private createFolderForm() {
        this.createTextSetting('Folder Name', 'Enter folder name', this.initialTitle, (value) => {
            this.result.title = value;
        });

        this.createTextSetting('Description', 'Enter description', this.initialDescription, (value) => {
            this.result.description = value;
        });

        this.createTextSetting('Short Name', 'Enter short name', this.initialShortName, (value) => {
            this.result.shortName = value;
        });
    }

    private createTextSetting(
        name: string,
        placeholder: string,
        value: string,
        onChange: (value: string) => void
    ) {
        new Setting(this.contentEl)
            .setName(name)
            .addText((text) =>
                text
                    .setPlaceholder(placeholder)
                    .setValue(value)
                    .onChange(onChange)
            );
    }
}