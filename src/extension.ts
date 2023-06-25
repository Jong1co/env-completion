import * as vscode from "vscode";
//1
async function readFile(filename: string) {
  const workspaceFolder = readWorkspaceFolder();
  const uri = vscode.Uri.joinPath(workspaceFolder.uri, filename);
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder().decode(data);
    return text;
  } catch (err) {
    console.error(err);
  }
}

const getEnvVariable = async (env: string) => {
  const data = await readFile(env);
  if (!data) {
    return;
  }

  const envVariable = data.split(/\n/g).filter((variable) => variable !== "");

  return envVariable.map((v) => {
    return v.split("=");
  });
};

//2
const filterEnvFileList = (fileList: [string, vscode.FileType][]) => {
  const regExp = /^\.env/g;
  return fileList
    .map(([name, type]) => name)
    .filter((filename) => filename.match(regExp));
};

function readWorkspaceFolder() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folders are open");
  }
  return workspaceFolder;
}

async function readDir(uri: vscode.Uri) {
  const filesAndDirectories = await vscode.workspace.fs.readDirectory(uri);
  return filesAndDirectories;
}

async function getEnvFilelist() {
  const workspaceFolder = readWorkspaceFolder();
  const filesAndDirectories = await readDir(workspaceFolder.uri);
  const filteredEnvFileList = filterEnvFileList(filesAndDirectories);

  return filteredEnvFileList;
}

//3
function makeCompletionItem(item: string, desc: string[]) {
  const completionItem = new vscode.CompletionItem(
    item,
    vscode.CompletionItemKind.EnumMember
  );
  completionItem.detail = "env-type";
  completionItem.insertText = new vscode.SnippetString(`process.env.${item}`);
  completionItem.documentation = new vscode.MarkdownString(desc.join(`\n`));

  return completionItem;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.languages.registerCompletionItemProvider(
    { language: "typescript", scheme: "file" },
    {
      async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const variable: { [key in string]: string[] } = {};
        const completionItemList: vscode.CompletionItem[] = [];

        const envFilelist = await getEnvFilelist();
        if (!envFilelist) {
          return;
        }

        for (let file of envFilelist) {
          const envVariable = await getEnvVariable(file);
          if (!envVariable) {
            continue;
          }
          envVariable.forEach(([key, value]) => {
            if (variable[key]) {
              variable[key].push(`${file}: \n${value}\n`);
            } else {
              variable[key] = [`${file}: \n${value}\n`];
            }
          });
        }

        Object.entries(variable).forEach(([key, value]) => {
          const completionItem = makeCompletionItem(key, value);
          completionItemList.push(completionItem);
        });

        return completionItemList;
      },
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
