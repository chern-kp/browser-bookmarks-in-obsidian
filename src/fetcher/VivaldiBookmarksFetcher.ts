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

    private determineNodeType(node: BookmarkNode): BookmarkType {
        const { type, meta_info } = node;

        if (type === BookmarkNodeType.FOLDER) {
            if (meta_info?.Description) return 'Folder Description';
            if (meta_info?.Nickname) return 'Folder Short Name';
            return 'Folder';
        }

        if (meta_info?.Description) return 'Bookmark Description';
        if (meta_info?.Nickname) return 'Bookmark Short Name';
        return 'Bookmark';
    }

    private buildBookmarkIndex(): void {
        if (!this.bookmarksData) return;

        const indexNode = (node: BookmarkNode): void => {
            const type = this.determineNodeType(node);
            this.bookmarkIndex[node.guid] = { node, type };
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
        isEditable = false
    ): string {
        if (!bookmarkNodes.length) return '';

        if (rootFolder) {
            return this.generateRootFolderMarkdown(bookmarkNodes, rootFolder, isEditable);
        }

        const markdown: string[] = [];
        const rootName = this.bookmarksData?.roots.bookmark_bar.name || CONSTANTS.DEFAULT_ROOT_NAME;
        markdown.push(`# ${rootName}\n`);

        bookmarkNodes.forEach(node => {
            markdown.push(this.generateNodeMarkdown(node, 0, isEditable));
        });

        return markdown.join('');
    }


    private generateRootFolderMarkdown(
        bookmarkNodes: BookmarkNode[], 
        rootFolder: string, 
        isEditable: boolean
    ): string {
        const rootNode = this.findFolderByName(bookmarkNodes, rootFolder);
        if (!rootNode) {
            return `# ${rootFolder}\n- Root folder "${rootFolder}" not found.\n`;
        }
    
        const markdown: string[] = [];
        markdown.push(`# ${rootNode.name}\n`);
        
        if (rootNode.children) {
            rootNode.children.forEach(child => {
                markdown.push(this.generateNodeMarkdown(child, 0, isEditable));
            });
        }
    
        return markdown.join('');
    }

    private generateFolderNodeMarkdown(
        node: BookmarkNode,
        indent: string,
        depth: number,
        isEditable: boolean
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
                markdown.push(this.generateNodeMarkdown(child, depth + 1, isEditable));
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

    private generateNodeMarkdown(node: BookmarkNode, depth: number, isEditable: boolean): string {
        const indent = ' '.repeat(CONSTANTS.INDENT_SPACES * depth);
        const markdown: string[] = [];

        if (node.type === BookmarkNodeType.URL) {
            markdown.push(this.generateUrlNodeMarkdown(node, indent, isEditable));
        } else if (node.type === BookmarkNodeType.FOLDER) {
            markdown.push(this.generateFolderNodeMarkdown(node, indent, depth, isEditable));
        }

        return markdown.join('');
    }


    private generateUrlNodeMarkdown(node: BookmarkNode, indent: string, isEditable: boolean): string {
        const markdown: string[] = [];

        markdown.push(`${indent}- [${node.name}](${node.url})`);
        if (isEditable) {
            markdown.push(`<span class="edit-icon" data-guid="${node.guid}">${CONSTANTS.EDIT_ICON}</span>`);
        }
        markdown.push('\n');

        if (node.meta_info) {
            const { Description, Nickname } = node.meta_info;
            const metaIndent = `${indent}  `;

            if (Description) {
                markdown.push(this.generateMetaInfoMarkdown(metaIndent, 'Description', Description, node.guid, isEditable));
            }
            if (Nickname) {
                markdown.push(this.generateMetaInfoMarkdown(metaIndent, 'Short Name', Nickname, node.guid, isEditable));
            }
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
        const markdown = `${indent}- ${label}: ${value}`;
        const editIcon = isEditable ?
            `<span class="edit-icon" data-guid="${guid}">${CONSTANTS.EDIT_ICON}</span>` : '';
        return `${markdown}${editIcon}\n`;
    }
}