export interface MyPluginSettings {
    mySetting: string;
    selectBookmarksFile: string;
}

export interface MyPluginSettings {
    mySetting: string;
    selectBookmarksFile: string;
    browser: 'Chrome' | 'Vivaldi';
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    selectBookmarksFile: '',
    browser: 'Vivaldi',
};
