import { promises as fsPromises } from 'fs';

export interface BookmarkNode {
    children?: BookmarkNode[];
    date_added: string;
    date_last_used: string;
    date_modified?: string;
    guid: string;
    id: string;
    meta_info?: {
        Description?: string;
        Nickname?: string;
        power_bookmark_meta?: string;
        Bookmarkbar?: string;
        Speeddial?: string;
        Thumbnail?: string;
    };
    name: string;
    type: 'url' | 'folder';
    url?: string;
}

interface BookmarksData {
    checksum: string;
    roots: {
        bookmark_bar: BookmarkNode;
        other: BookmarkNode;
        synced: BookmarkNode;
        trash: BookmarkNode;
    };
    version: number;
}

export class VivaldiBookmarksFetcher {
    bookmarksData: BookmarksData | null = null;
    constructor(private filePath: string) { }

    async loadBookmarks(): Promise<void> {
        try {
            const fileContent = await fsPromises.readFile(this.filePath, 'utf-8');
            this.bookmarksData = JSON.parse(fileContent) as BookmarksData;
        } catch (error) {
            console.error('Error loading bookmarks file:', error);
            throw error;
        }
    }

    getAllBookmarks(): BookmarkNode[] {
        if (!this.bookmarksData) {
            throw new Error('Bookmarks data not loaded.');
        }

        const allBookmarks: BookmarkNode[] = [];
        this.traverseBookmarks(this.bookmarksData.roots.bookmark_bar, allBookmarks);
        this.traverseBookmarks(this.bookmarksData.roots.other, allBookmarks);
        this.traverseBookmarks(this.bookmarksData.roots.synced, allBookmarks);
        return allBookmarks;
    }

    private traverseBookmarks(node: BookmarkNode, result: BookmarkNode[]): void {
        if (node.type === 'url') {
            result.push(node);
        } else if (node.type === 'folder' && node.children) {
            for (const child of node.children) {
                this.traverseBookmarks(child, result);
            }
        }
    }

    getBookmarksByFolder(folderName: string): BookmarkNode[] {
        if (!this.bookmarksData) {
            throw new Error('Bookmarks data not loaded.');
        }

        const bookmarksInFolder: BookmarkNode[] = [];
        this.findBookmarksInFolder(this.bookmarksData.roots.bookmark_bar, folderName, bookmarksInFolder);
        this.findBookmarksInFolder(this.bookmarksData.roots.other, folderName, bookmarksInFolder);
        this.findBookmarksInFolder(this.bookmarksData.roots.synced, folderName, bookmarksInFolder);
        return bookmarksInFolder;
    }

    private findBookmarksInFolder(node: BookmarkNode, folderName: string, result: BookmarkNode[]): boolean {
        if (node.type === 'folder' && node.name === folderName) {
            if (node.children) {
                for (const child of node.children) {
                    if (child.type === 'url') {
                        result.push(child);
                    }
                }
            }
            return true;
        } else if (node.type === 'folder' && node.children) {
            for (const child of node.children) {
                if (this.findBookmarksInFolder(child, folderName, result)) {
                    return true;
                }
            }
        }
        return false;
    }

    getBookmarksByMetadata(key: string, value: string): BookmarkNode[] {
        if (!this.bookmarksData) {
            throw new Error('Bookmarks data not loaded.');
        }

        const matchingBookmarks: BookmarkNode[] = [];
        this.findBookmarksByMetadata(this.bookmarksData.roots.bookmark_bar, key, value, matchingBookmarks);
        this.findBookmarksByMetadata(this.bookmarksData.roots.other, key, value, matchingBookmarks);
        this.findBookmarksByMetadata(this.bookmarksData.roots.synced, key, value, matchingBookmarks);
        return matchingBookmarks;
    }

    private findBookmarksByMetadata(node: BookmarkNode, key: string, value: string, result: BookmarkNode[]): void {
        if (node.meta_info && node.meta_info[key as keyof typeof node.meta_info] === value) {
            result.push(node);
        }

        if (node.type === 'folder' && node.children) {
            for (const child of node.children) {
                this.findBookmarksByMetadata(child, key, value, result);
            }
        }
    }

    generateBookmarkListMarkdown(bookmarkNodes: BookmarkNode[], depth = 0): string {
        let markdown = '';
        for (const node of bookmarkNodes) {
            const indent = '  '.repeat(depth);
            if (node.type === 'url') {
                markdown += `${indent}- [${node.name}](${node.url})\n`;
                if (node.meta_info && (node.meta_info.Description || node.meta_info.Nickname)) {
                    const descriptionIndent = '  '.repeat(depth + 1);
                    if (node.meta_info.Description) {
                        markdown += `${descriptionIndent}- Description: ${node.meta_info.Description}\n`;
                    }
                    if (node.meta_info.Nickname) {
                        markdown += `${descriptionIndent}- Short Name: ${node.meta_info.Nickname}\n`;
                    }
                }
            } else if (node.type === 'folder') {
                markdown += `${indent}- **${node.name}**\n`;
                if (node.children) {
                    markdown += this.generateBookmarkListMarkdown(node.children, depth + 1);
                }
            }
        }
        return markdown;
    }

    getBookmarksByRootAndDepth(rootIndex: number, depth: number): BookmarkNode[] {
        if (!this.bookmarksData) {
            throw new Error('Bookmarks data not loaded. Call loadBookmarks() first.');
        }
    
        const roots = [this.bookmarksData.roots.bookmark_bar, this.bookmarksData.roots.other, this.bookmarksData.roots.synced];
        const selectedRoot = roots[rootIndex] || roots[0];
        return this.getBookmarksAtDepth(selectedRoot, depth);
    }
    
    private getBookmarksAtDepth(node: BookmarkNode, depth: number): BookmarkNode[] {
        if (depth === 0) {
            return node.children || [];
        }
        if (node.children) {
            for (const child of node.children) {
                if (child.type === 'folder') {
                    const result = this.getBookmarksAtDepth(child, depth - 1);
                    if (result.length > 0) {
                        return result;
                    }
                }
            }
        }
        return [];
    }
}
