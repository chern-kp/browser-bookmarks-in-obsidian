export interface MyPluginSettings {
    mySetting: string;
    selectBookmarksFile: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    selectBookmarksFile: '',
};
