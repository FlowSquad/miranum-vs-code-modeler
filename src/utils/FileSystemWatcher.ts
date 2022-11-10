import * as vscode from "vscode";
import {BpmnModeler} from "../BpmnModeler";

export class FileSystemWatcher {

    public static watchedPaths: Set<string>;

    private readonly observers: Array<vscode.Webview> = [];
    private watcher: vscode.FileSystemWatcher | undefined;

    constructor(
        private readonly projectUri: vscode.Uri
    ) {
    }

    public subscribe(observer: vscode.Webview): void {
        this.observers.push(observer);
    }

    public registerWatcher(subfolder: string, pattern: string) {
        const uriStr = this.projectUri.toString();

        if (FileSystemWatcher.watchedPaths.has(uriStr + subfolder)) {
            throw new Error(`Path ${uriStr} is already being watched!`);
        }

        FileSystemWatcher.watchedPaths.add(uriStr);
        this.watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.projectUri, pattern)
        );
    }

    public registerCreateEvent(cb: Function): void {
        this.watcher?.onDidCreate((uri) => {
            // get subfolder from uri

            // decide which file was created (e.g. element template)

            // read content of new file

            // add new file to existing files

            // send all files to observers
            this.observers.forEach((observer) => {
                observer.postMessage({
                    type: BpmnModeler.viewType + '.updateFiles',
                    files: []
                });
            });
        });
    }

}