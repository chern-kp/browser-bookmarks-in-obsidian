export enum BookmarkNodeType {
    URL = 'url',
    FOLDER = 'folder'
}

export interface MetaInfo {
    Description?: string;
    Nickname?: string;
    power_bookmark_meta?: string;
    Bookmarkbar?: string;
    Speeddial?: string;
    Thumbnail?: string;
}

export interface BookmarkNode {
    children?: BookmarkNode[];
    date_added: string;
    date_last_used: string;
    date_modified?: string;
    guid: string;
    id: string;
    meta_info?: MetaInfo;
    name: string;
    type: BookmarkNodeType;
    url?: string;
}

export interface BookmarksData {
    checksum: string;
    roots: {
        bookmark_bar: BookmarkNode;
        other: BookmarkNode;
        synced: BookmarkNode;
        trash: BookmarkNode;
    };
    version: number;
}

export type BookmarkType = 
    | 'Bookmark' 
    | 'Bookmark Description' 
    | 'Bookmark Short Name'
    | 'Folder' 
    | 'Folder Description' 
    | 'Folder Short Name';
