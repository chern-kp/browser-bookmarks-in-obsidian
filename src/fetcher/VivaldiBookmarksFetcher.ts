import * as fsPromises from 'fs/promises';
import { BookmarkNodeType, BookmarkNode, BookmarksData, BookmarkType } from './types';
import { CONSTANTS } from './constants';

export class VivaldiBookmarksFetcher {
    bookmarksData: BookmarksData | null = null;
    private bookmarkIndex: Record<string, { node: BookmarkNode, type: BookmarkType }> = {};

    constructor(private filePath: string) { }

    async loadBookmarks(): Promise<void> {
        try {
            const fileContent = await fsPromises.readFile(this.filePath, 'utf-8');
            this.bookmarksData = JSON.parse(fileContent) as BookmarksData;
            this.buildBookmarkIndex();
        } catch (error) {
            console.error('Error loading bookmarks file:', error);
            throw error;
        }
    }

    private determineNodeType(node: BookmarkNode, targetGuid: string): BookmarkType {
        if (node.meta_info?.Description &&
            this.isMetaInfoGuid(node.guid, targetGuid, 'Description')) {
            return node.type === BookmarkNodeType.FOLDER ?
                'Folder Description' :
                'Bookmark Description';
        }

        if (node.meta_info?.Nickname &&
            this.isMetaInfoGuid(node.guid, targetGuid, 'Nickname')) {
            return node.type === BookmarkNodeType.FOLDER ?
                'Folder Short Name' :
                'Bookmark Short Name';
        }

        return node.type === BookmarkNodeType.FOLDER ? 'Folder' : 'Bookmark';
    }

    private isMetaInfoGuid(nodeGuid: string, targetGuid: string, metaType: 'Description' | 'Nickname'): boolean {
        return `${nodeGuid}_${metaType}` === targetGuid;
    }

    private buildBookmarkIndex(): void {
        if (!this.bookmarksData) return;

        const indexNode = (node: BookmarkNode): void => {
            this.bookmarkIndex[node.guid] = {
                node,
                type: this.determineNodeType(node, node.guid)
            };

            if (node.meta_info) {
                if (node.meta_info.Description) {
                    const descriptionGuid = `${node.guid}_Description`;
                    this.bookmarkIndex[descriptionGuid] = {
                        node,
                        type: node.type === BookmarkNodeType.FOLDER ?
                            'Folder Description' :
                            'Bookmark Description'
                    };
                }
                if (node.meta_info.Nickname) {
                    const nicknameGuid = `${node.guid}_Nickname`;
                    this.bookmarkIndex[nicknameGuid] = {
                        node,
                        type: node.type === BookmarkNodeType.FOLDER ?
                            'Folder Short Name' :
                            'Bookmark Short Name'
                    };
                }
            }

            node.children?.forEach(indexNode);
        };

        Object.values(this.bookmarksData.roots).forEach(indexNode);
    }

    private traverseRoots<T>(callback: (root: BookmarkNode) => T[]): T[] {
        if (!this.bookmarksData) {
            throw new Error(CONSTANTS.ERROR_MESSAGES.NOT_LOADED);
        }

        const { bookmark_bar, other, synced } = this.bookmarksData.roots;
        return [
            ...callback(bookmark_bar),
            ...callback(other),
            ...callback(synced)
        ];
    }

    getAllBookmarks(): BookmarkNode[] {
        return this.traverseRoots(root => {
            const bookmarks: BookmarkNode[] = [];
            this.traverseBookmarks(root, bookmarks);
            return bookmarks;
        });
    }

    private traverseBookmarks(node: BookmarkNode, result: BookmarkNode[]): void {
        if (node.type === BookmarkNodeType.URL) {
            result.push(node);
        } else if (node.type === BookmarkNodeType.FOLDER) {
            node.children?.forEach(child => this.traverseBookmarks(child, result));
        }
    }

    generateBookmarkListMarkdown(
        bookmarkNodes: BookmarkNode[],
        depth = 0,
        rootFolder: string | null = null,
        isEditable = false,
        bigDescription = false
    ): string {
        if (!bookmarkNodes.length) return '';

        if (rootFolder) {
            return this.generateRootFolderMarkdown(bookmarkNodes, rootFolder, isEditable, bigDescription);
        }

        const markdown: string[] = [];
        const rootName = this.bookmarksData?.roots.bookmark_bar.name || CONSTANTS.DEFAULT_ROOT_NAME;
        markdown.push(`# ${rootName}\n`);

        bookmarkNodes.forEach(node => {
            markdown.push(this.generateNodeMarkdown(node, 0, isEditable, bigDescription));
        });

        return markdown.join('');
    }


    private generateRootFolderMarkdown(
        bookmarkNodes: BookmarkNode[],
        rootFolder: string,
        isEditable: boolean,
        bigDescription: boolean
    ): string {
        const rootNode = this.findFolderByName(bookmarkNodes, rootFolder);
        if (!rootNode) {
            return `# ${rootFolder}\n- Root folder "${rootFolder}" not found.\n`;
        }

        const markdown: string[] = [];
        markdown.push(`# ${rootNode.name}\n`);

        if (rootNode.children) {
            rootNode.children.forEach(child => {
                markdown.push(this.generateNodeMarkdown(child, 0, isEditable, bigDescription));
            });
        }

        return markdown.join('');
    }

    private generateFolderNodeMarkdown(
        node: BookmarkNode,
        indent: string,
        depth: number,
        isEditable: boolean,
        bigDescription: boolean
    ): string {
        const markdown: string[] = [];

        markdown.push(`${indent}- **${node.name}**`);
        if (isEditable) {
            markdown.push(`<span class="edit-icon" data-guid="${node.guid}">${CONSTANTS.EDIT_ICON}</span>`);
        }
        markdown.push('\n');

        if (node.meta_info) {
            const { Description, Nickname } = node.meta_info;
            const metaIndent = `${indent}  `;

            if (Description) {
                markdown.push(this.generateMetaInfoMarkdown(
                    metaIndent,
                    'Description',
                    Description,
                    node.guid,
                    isEditable
                ));
            }
            if (Nickname) {
                markdown.push(this.generateMetaInfoMarkdown(
                    metaIndent,
                    'Short Name',
                    Nickname,
                    node.guid,
                    isEditable
                ));
            }
        }

        if (node.children) {
            node.children.forEach(child => {
                markdown.push(this.generateNodeMarkdown(child, depth + 1, isEditable, true));
            });
        }


        return markdown.join('');
    }

    private findFolderByName(nodes: BookmarkNode[], folderName: string): BookmarkNode | null {
        for (const node of nodes) {
            if (node.type === BookmarkNodeType.FOLDER && node.name === folderName) {
                return node;
            }
            if (node.type === BookmarkNodeType.FOLDER && node.children) {
                const foundNode = this.findFolderByName(node.children, folderName);
                if (foundNode) {
                    return foundNode;
                }
            }
        }
        return null;
    }

    public getBookmarkByGuid(guid: string): { node: BookmarkNode, type: BookmarkType } | null {
        return this.bookmarkIndex[guid] || null;
    }

    private generateNodeMarkdown(
        node: BookmarkNode,
        depth: number,
        isEditable: boolean,
        bigDescription: boolean
    ): string {
        const indent = ' '.repeat(CONSTANTS.INDENT_SPACES * depth);
        const markdown: string[] = [];

        if (node.type === BookmarkNodeType.URL) {
            markdown.push(this.generateUrlNodeMarkdown(node, indent, isEditable, bigDescription));
        } else if (node.type === BookmarkNodeType.FOLDER) {
            markdown.push(this.generateFolderNodeMarkdown(node, indent, depth, isEditable, bigDescription));
        }

        return markdown.join('');
    }


    private generateUrlNodeMarkdown(
        node: BookmarkNode, 
        indent: string, 
        isEditable: boolean,
        bigDescription: boolean
    ): string {
        const markdown: string[] = [];
        let line = `${indent}- [${node.name}](${node.url})`;
    
        if (!bigDescription && node.meta_info?.Description) {
            line += ` — ${node.meta_info.Description}`;
        }
    
        if (isEditable) {
            line += `<span class="edit-icon" data-guid="${node.guid}">${CONSTANTS.EDIT_ICON}</span>`;
        }
        markdown.push(line + '\n');
    
        if (bigDescription && node.meta_info?.Description) {
            markdown.push(`${node.meta_info.Description}\n`);
        }
    
        if (node.meta_info?.Nickname) {
            markdown.push(this.generateMetaInfoMarkdown(
                `${indent}  `,
                'Short Name',
                node.meta_info.Nickname,
                node.guid,
                isEditable
            ));
        }
    
        return markdown.join('');
    }

    private generateMetaInfoMarkdown(
        indent: string,
        label: string,
        value: string,
        guid: string,
        isEditable: boolean
    ): string {
        const metaType = label === 'Description' ? 'Description' : 'Nickname';
        const metaGuid = `${guid}_${metaType}`;
        const markdown = `${indent}- ${label}: ${value}`;
        const editIcon = isEditable ?
            `<span class="edit-icon" data-guid="${metaGuid}">${CONSTANTS.EDIT_ICON}</span>` : '';
        return `${markdown}${editIcon}\n`;
    }

    async saveBookmarkChanges(
        guid: string,
        changes: {
            title?: string;
            url?: string;
            description?: string;
            shortName?: string;
        }
    ): Promise<void> {
        if (!this.bookmarksData) {
            throw new Error('Bookmarks data not loaded');
        }

        const bookmarkData = this.bookmarkIndex[guid];
        if (!bookmarkData) {
            throw new Error('Bookmark not found');
        }

        const { node, type } = bookmarkData;

        switch (type) {
            case 'Bookmark':
                if (changes.title) node.name = changes.title;
                if (changes.url) node.url = changes.url;
                if (changes.description) {
                    if (!node.meta_info) node.meta_info = {};
                    node.meta_info.Description = changes.description;
                }
                if (changes.shortName) {
                    if (!node.meta_info) node.meta_info = {};
                    node.meta_info.Nickname = changes.shortName;
                }
                break;
            case 'Folder':
                if (changes.title) node.name = changes.title;
                if (changes.description) {
                    if (!node.meta_info) node.meta_info = {};
                    node.meta_info.Description = changes.description;
                }
                if (changes.shortName) {
                    if (!node.meta_info) node.meta_info = {};
                    node.meta_info.Nickname = changes.shortName;
                }
                break;
            case 'Bookmark Description':
            case 'Folder Description':
                if (!node.meta_info) node.meta_info = {};
                if (changes.description) node.meta_info.Description = changes.description;
                break;
            case 'Bookmark Short Name':
            case 'Folder Short Name':
                if (!node.meta_info) node.meta_info = {};
                if (changes.shortName) node.meta_info.Nickname = changes.shortName;
                break;
        }

        node.date_modified = new Date().getTime().toString();
        await this.saveToFile();
        this.buildBookmarkIndex();
    }

    private async saveToFile(): Promise<void> {
        try {
            const jsonString = JSON.stringify(this.bookmarksData, null, 2);
            await fsPromises.writeFile(this.filePath, jsonString, 'utf-8');
        } catch (error) {
            console.error('Error saving bookmarks file:', error);
            throw error;
        }
    }

}