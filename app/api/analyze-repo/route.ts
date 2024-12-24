import { NextRequest, NextResponse } from "next/server";
import simpleGit from "simple-git";
import fs from "fs-extra";
import path from "path";
import { tmpdir } from "os";

// Initialize simple-git to interact with Git
const git = simpleGit();

interface RepoInfo {
  readmeContent: string;
  packageJson: Record<string, unknown> | string;
  fileStructure: FolderNode[];
  directoryGraph: string;
  treeStructure: string; // Added for tree visualization
  importantLibraries: {
    dependencies: { name: string; version: string }[];
    devDependencies: { name: string; version: string }[];
  };
}

interface FolderNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FolderNode[];
}

// Function to generate tree structure
async function generateTree(dir: string, prefix: string = "", isLast: boolean = true): Promise<string> {
  let tree = "";
  const files = await fs.readdir(dir);
  const filteredFiles = files.filter(file => !['node_modules', '.git', '.next', 'dist'].includes(file));
  
  for (let i = 0; i < filteredFiles.length; i++) {
    const file = filteredFiles[i];
    const fullPath = path.join(dir, file);
    const isLastItem = i === filteredFiles.length - 1;
    const stat = await fs.stat(fullPath);
    
    const marker = isLastItem ? "└──" : "├──";
    const indent = prefix.replace(/├──/g, "│  ").replace(/└──/g, "   ");
    
    // Add icons for better visualization
    const icon = stat.isDirectory() ? "📁" : "📄";
    tree += `${prefix}${marker} ${icon} ${file}\n`;
    
    if (stat.isDirectory()) {
      const newPrefix = `${prefix}${isLastItem ? "    " : "│   "}`;
      tree += await generateTree(fullPath, newPrefix, isLastItem);
    }
  }
  
  return tree;
}

// Function to analyze the repo and gather the necessary details
async function analyzeRepo(repoUrl: string, tempDir: string): Promise<RepoInfo> {
  const gitHubMatch = repoUrl.match(/github\.com\/([\w-]+)\/([\w-]+)/);
  if (!gitHubMatch) throw new Error("Invalid GitHub URL");

  const [, owner, repo] = gitHubMatch;
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;

  try {
    // Clone the repository into a temporary directory
    await git.clone(cloneUrl, tempDir);

    // Analyze the repository structure and gather details
    const folderAnalysis = await getFolderStructure(tempDir);
    const mermaidGraph = `graph TD\n${folderAnalysis.mermaidGraph}`;
    const treeStructure = await generateTree(tempDir);
  
    const repoInfo: RepoInfo = {
      readmeContent: await getReadmeContent(tempDir),
      packageJson: await getPackageJsonContent(tempDir),
      fileStructure: folderAnalysis.structure,
      directoryGraph: mermaidGraph,
      treeStructure: treeStructure,
      importantLibraries: await getImportantLibraries(tempDir),
    };

    return repoInfo;
  } catch (err) {
    console.error('Error analyzing repository:', err);
    throw new Error('Failed to analyze repository');
  }
}

// Read README.md file if it exists
async function getReadmeContent(dir: string): Promise<string> {
  const readmePath = path.join(dir, "README.md");
  if (await fs.pathExists(readmePath)) {
    return await fs.readFile(readmePath, "utf8");
  }
  return "README.md not found";
}

// Read package.json file if it exists
async function getPackageJsonContent(dir: string): Promise<Record<string, unknown> | string> {
  const packageJsonPath = path.join(dir, "package.json");
  if (await fs.pathExists(packageJsonPath)) {
    return await fs.readJson(packageJsonPath);
  }
  return "package.json not found";
}

// Get folder structure of the repository (files and directories)
async function getFolderStructure(dir: string, basePath: string = ''): Promise<{
  structure: FolderNode[];
  mermaidGraph: string;
}> {
  const files = await fs.readdir(dir);
  const structure: FolderNode[] = [];
  const mermaidNodes: string[] = [];
  
  for (const file of files) {
    // Skip node_modules and .git directories
    if (file === 'node_modules' || file === '.git') continue;
    
    const fullPath = path.join(dir, file);
    const relativePath = path.join(basePath, file);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      const subDirectory = await getFolderStructure(fullPath, relativePath);
      structure.push({
        name: file,
        type: 'directory',
        path: fullPath,
        children: subDirectory.structure
      });
      
      // Add directory node
      const safeId = relativePath.replace(/[\/\s-]/g, '_');
      mermaidNodes.push(`  ${safeId}["📁 ${file}"]`);
      
      // Add connections from parent to children
      mermaidNodes.push(...subDirectory.mermaidGraph.split('\n'));
      
      // Connect parent to all immediate children
      const childFiles = await fs.readdir(fullPath);
      for (const childFile of childFiles) {
        if (childFile === 'node_modules' || childFile === '.git') continue;
        const childPath = path.join(relativePath, childFile);
        const childSafeId = childPath.replace(/[\/\s-]/g, '_');
        mermaidNodes.push(`  ${safeId} --> ${childSafeId}`);
      }
    } else {
      structure.push({
        name: file,
        type: 'file',
        path: fullPath
      });
      
      // Add file node
      const safeId = relativePath.replace(/[\/\s-]/g, '_');
      mermaidNodes.push(`  ${safeId}["📄 ${file}"]`);
    }
  }
  
  return {
    structure,
    mermaidGraph: mermaidNodes.join('\n')
  };
}

// Extract important libraries from package.json (dependencies)
async function getImportantLibraries(dir: string): Promise<{
  dependencies: { name: string; version: string }[];
  devDependencies: { name: string; version: string }[];
}> {
  const packageJson = await getPackageJsonContent(dir);

  if (typeof packageJson === "string") return { dependencies: [], devDependencies: [] };

  const dependencies: Record<string, string> = packageJson.dependencies as Record<string, string> || {};
  const devDependencies: Record<string, string> = packageJson.devDependencies as Record<string, string> || {};

  const formatDependencies = (deps: Record<string, string>) =>
    Object.entries(deps).map(([name, version]) => ({ name, version }));

  return {
    dependencies: formatDependencies(dependencies),
    devDependencies: formatDependencies(devDependencies),
  };
}

// API route handler
export async function POST(req: NextRequest) {
  const { repoUrl } = await req.json(); // Extract the repo URL from the request body

  if (!repoUrl) {
    return NextResponse.json({ error: "Repository URL is required" }, { status: 400 });
  }

  const tempDir = path.join(tmpdir(), `temp-repo-${Date.now()}`); // Unique temp directory

  try {
    const repoInfo = await analyzeRepo(repoUrl, tempDir);
    await fs.remove(tempDir); // Clean up the temporary repo directory

    return NextResponse.json({ success: true, repoInfo }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error analyzing the repository" }, { status: 500 });
  } finally {
    await fs.remove(tempDir).catch(console.error); // Ensure cleanup
  }
}