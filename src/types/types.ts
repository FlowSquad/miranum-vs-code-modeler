interface ProjectStructure {
    dir: Directories | undefined,   // undefined -> file
    filePattern: string
}

enum Directories {
    configsDir = 'configs',
    elTemplatesDir = 'element-templates',
    formsDir = 'forms'
}

export const projectConfig: {[k: string]: ProjectStructure} = {
    config: {dir: Directories.configsDir, filePattern: "*.json"},
    elTemplates: {dir: Directories.elTemplatesDir, filePattern: "*.json"},
    forms: {dir: Directories.formsDir, filePattern: "*.forms"},
    dmn: {dir: undefined, filePattern: "*.dmn"}
};