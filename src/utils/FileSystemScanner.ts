import * as vscode from "vscode";
import * as structure from "../config/ProjectStructure.json";

/**
 * Scan the current working directory for important files.
 */
export class FileSystemScanner {

    private readonly fs = vscode.workspace.fs;

    constructor(
        private readonly projectUri: vscode.Uri
    ) {
    }

    /**
     * Get all possible file types.
     */
    public getAllFiles(): Promise<JSON[][]> {
        const thenables = [
            this.getForms(),
            this.getElementTemplates()
        ];
        return Promise.all(thenables);
    }

    /**
     * Get element templates from the current working directory
     */
    public getElementTemplates(): Thenable<Array<JSON>> {
        const uri = vscode.Uri.joinPath(this.projectUri, structure.elementTemplates.path);
        return this.getResultsAsJson(this.readFile(uri));
    }

    /**
     * Get forms from the current working directory
     */
    public getForms(): Thenable<Array<JSON>> {
        const uri = vscode.Uri.joinPath(this.projectUri, structure.forms.path);
        return this.getResultsAsJson(this.readFile(uri));
    }

    /**
     * Converts the content of a thenable from string to json
     * @param thenable The thenable whose results are to be converted to json
     * @returns Thenable with an array of json objects
     * @private
     */
    private getResultsAsJson(thenable: Thenable<Awaited<string>[]>): Thenable<Array<JSON>> {
        return thenable
            .then((results) => {
                const files: Array<JSON> = [];
                results.forEach((result) => {
                    files.push(JSON.parse(result));
                });
                return files;
            });
    }

    /**
     * Read files and returns their content as a Thenable
     * @param directory Path where the files are
     * @returns Thenable with the content of the read files
     * @private
     */
    private readFile(directory: vscode.Uri): Thenable<Awaited<string>[]> {
        return this.fs.readDirectory(directory)
            .then((files) => {
                const promises: Array<Thenable<string>> = [];
                files.forEach((file) => {
                    const fileUri = vscode.Uri.joinPath(directory, file[0]);
                    promises.push(this.fs.readFile(fileUri)
                        .then((content) => {
                            return Buffer.from(content).toString('utf-8');
                        }));
                });
                return Promise.all(promises);
            });
    }
}