import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

class ProjectTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private root: string) {}
  onDidChangeTreeData?: vscode.Event<vscode.TreeItem | null>;
  getTreeItem(item: vscode.TreeItem) { return item; }
  getChildren(item?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    const dir = item
      ? path.join(this.root, item.label as string)
      : this.root;
    return Promise.resolve(
      fs.readdirSync(dir).map(name => {
        const full = path.join(dir, name);
        const isDir = fs.statSync(full).isDirectory();
        return <vscode.TreeItem>{
          label: name,
          collapsibleState: isDir
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          command: !isDir
            ? {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(full)]
              }
            : undefined
        };
      })
    );
  }
}

class LLMAssistantProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
    const action = new vscode.CodeAction('🔍 Ask LLM Assistant', vscode.CodeActionKind.QuickFix);
    action.command = {
      command: 'llmAssistant.askAboutCode',
      title: 'Ask about this code',
      arguments: [document, range]
    };
    return [action];
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  
  // Register Tree View
  const provider = new ProjectTreeProvider(ws);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('llmAssistant.projectTree', provider)
  );

  // Register Code Action Provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      '*', 
      new LLMAssistantProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // Register Ask Command
  context.subscriptions.push(
    vscode.commands.registerCommand('llmAssistant.askAboutCode', 
      async (doc: vscode.TextDocument, range: vscode.Range) => {
        const text = doc.getText(range);
        try {
          const response = await axios.post('http://localhost:5000/ask', {
            question: `About this code:\n${text}\n\nPlease analyze and suggest improvements.`
          });
          
          const panel = vscode.window.createWebviewPanel(
            'llmResponse',
            'LLM Analysis',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
          );
          panel.webview.html = `
            <h3>Code Analysis</h3>
            <pre>${text}</pre>
            <h3>LLM Suggestions</h3>
            <p>${response.data.response}</p>
          `;
        } catch (error) {
          vscode.window.showErrorMessage('Failed to get LLM response');
        }
      }
    )
  );

  // Initial project indexing
  if (ws) {
    try {
      await axios.post('http://localhost:5000/index_project', {
        project_path: ws
      });
    } catch (error) {
      console.error('Initial indexing failed:', error);
    }
  }
}