export const CONSTANTS = {
    INDENT_SPACES: 2,
    EDIT_ICON: '✏️',
    DEFAULT_ROOT_NAME: 'Bookmarks',
    ERROR_MESSAGES: {
        NOT_LOADED: 'Bookmarks data not loaded.',
        LOAD_FIRST: 'Bookmarks data not loaded. Call loadBookmarks() first.'
    }
} as const;

export type ConstantsType = typeof CONSTANTS;
export const { 
    INDENT_SPACES,
    EDIT_ICON,
    DEFAULT_ROOT_NAME,
    ERROR_MESSAGES
} = CONSTANTS;