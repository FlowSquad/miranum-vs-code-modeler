import * as vscode from 'vscode';
import * as structure from './config/ProjectStructure.json';
import {FileSystemScanner} from "./utils/FileSystemScanner";
import {FileSystemWatcher} from "./utils/FileSystemWatcher";

export class BpmnModeler implements vscode.CustomTextEditorProvider {

    public static readonly viewType = 'bpmn-modeler';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new BpmnModeler(context);
        return vscode.window.registerCustomEditorProvider(BpmnModeler.viewType, provider);
    }

    public constructor(
        private readonly context: vscode.ExtensionContext
    ) {
    }

    /**
     * Called when the custom editor / source file is opened
     * @param document Represents the source file
     * @param webviewPanel Panel that contains the webview
     * @param token Token to cancel asynchronous or long-running operations
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken): Promise<void> {
        let isUpdateFromWebview = false;

        webviewPanel.webview.options = {
            enableScripts: true
        };

        const fileSystemScanner = new FileSystemScanner(this.getProjectUri(document.uri.toString()));
        fileSystemScanner.getAllFiles()
            .then((result) => {
                webviewPanel.webview.html =
                    this.getHtmlForWebview(webviewPanel.webview, this.context.extensionUri, document.getText(), result);
            });


        webviewPanel.webview.onDidReceiveMessage((event) => {
            switch (event.type) {
                case BpmnModeler.viewType + '.updateFromWebview':
                    isUpdateFromWebview = true;
                    this.updateTextDocument(document, event.content);
            }
        });

        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: BpmnModeler.viewType + '.updateFromExtension',
                text: document.getText()
            });
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.uri.toString() && event.contentChanges.length !== 0) {
                if (!isUpdateFromWebview) {
                    updateWebview();
                }
                isUpdateFromWebview = false;
            }
        });

        const watcher = new FileSystemWatcher(this.getProjectUri(document.uri.toString()));
        try {
            watcher.registerWatcher(
                structure.elementTemplates.path,
                structure.elementTemplates.filePattern,
            );
            watcher.subscribe(webviewPanel.webview);
        }
        catch (error) {
            watcher.subscribe(webviewPanel.webview);
        }

        /*
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.Uri.joinPath(
                    this.getProjectUri(document.uri.toString()),
                    'element-templates'
                ),
                '*.json')
        );

        watcher.onDidCreate((event) => {
            console.log('onDidCreate', event);
        });
        */

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            //watcher.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, initialContent: string, files: Array<Array<any>>) {

        const scriptApp = webview.asWebviewUri(vscode.Uri.joinPath(
            extensionUri, 'dist', 'client', 'client.mjs'
        ));

        const styleReset = webview.asWebviewUri(vscode.Uri.joinPath(
            extensionUri, 'resources', 'css', 'reset.css'
        ));

        const styleApp = webview.asWebviewUri(vscode.Uri.joinPath(
            extensionUri, 'dist', 'client', 'style.css'
        ));

        const fontBpmn = webview.asWebviewUri(vscode.Uri.joinPath(
            extensionUri, 'dist', 'client', 'assets', 'bpmn-font', 'css', 'bpmn.css'
        ));

        const nonce = this.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} 'unsafe-inline';
                    img-src ${webview.cspSource} data:;
                    font-src ${webview.cspSource};
                    script-src 'nonce-${nonce}';"/>

                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                
                <link href="${styleReset}" rel="stylesheet" type="text/css" />
                <link href="${styleApp}" rel="stylesheet" type="text/css" />
                <link href="${fontBpmn}" rel="stylesheet" type="text/css" />

                <title>Custom Texteditor Template</title>
            </head>
            <body>
              <div class="content with-diagram" id="js-drop-zone">

                <div class="message error">
                  <div class="note">
                    <p>Ooops, we could not display the BPMN 2.0 diagram.</p>

                    <div class="details">
                      <span>Import Error Details</span>
                      <pre></pre>
                    </div>
                  </div>
                </div>

                <div class="canvas" id="js-canvas"></div>
                <div class="properties-panel-parent" id="js-properties-panel"></div>
              </div>
              
              <script type="text/javascript" nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                vscode.setState({
                  text: '${JSON.stringify(initialContent)}',
                  files: '${JSON.stringify(files)}'    // serialize files-Array
                });
              </script>
              <script type="text/javascript" src="${scriptApp}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private updateTextDocument(document: vscode.TextDocument, text: string): Thenable<boolean> {
        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            text
        );

        return vscode.workspace.applyEdit(edit);
    }

    private getProjectUri(path: string): vscode.Uri {
        const filename = path.replace(/^.*[\\\/]/, '');
        return vscode.Uri.parse(path.substring(0, path.indexOf(filename)));
    }
}