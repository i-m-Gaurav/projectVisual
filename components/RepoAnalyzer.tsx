'use client'

import { useState, ChangeEvent, useEffect } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';

interface RepoInfo {
  readmeContent: string;
  packageJson: Record<string, unknown>;
  fileStructure: { name: string; type: string; path: string }[];
  importantLibraries: {
    dependencies: { name: string; version: string }[];
    devDependencies: { name: string; version: string }[];
  };
  treeStructure: string;
}

const RepoAnalyzer = () => {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetching repo details on button click
  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/analyze-repo', { repoUrl });
      setRepoInfo(response.data.repoInfo);
    } catch (err) {
      console.error(err);
      setError('Error analyzing the repository');
    }
    setLoading(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
  };

  // Convert file structure into Mermaid-compatible format for diagram rendering
  const generateMermaidDiagram = (fileStructure: { name: string; type: string; path: string }[]) => {
    let diagram = 'graph TD;\n';
    const pathMap: Record<string, string[]> = {};

    fileStructure.forEach((file) => {
      const parts = file.path.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        const parent = parts.slice(0, i + 1).join('/');
        const child = parts.slice(0, i + 2).join('/');
        if (!pathMap[parent]) {
          pathMap[parent] = [];
        }
        if (!pathMap[parent].includes(child)) {
          pathMap[parent].push(child);
        }
      }
    });

    Object.keys(pathMap).forEach((parent) => {
      pathMap[parent].forEach((child) => {
        diagram += `${parent} --> ${child};\n`;
      });
    });

    return diagram;
  };

  // Initialize mermaid for rendering diagram
  useEffect(() => {
    if (repoInfo && repoInfo.fileStructure.length > 0) {
      mermaid.init();
    }
  }, [repoInfo]);

  return (
    <div>
      <h1>Analyze Repository Architecture</h1>
      <input
        className="text-black w-[400px]"
        type="text"
        placeholder="Enter GitHub repo URL"
        value={repoUrl}
        onChange={handleChange}
      />
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Generate Architecture'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {repoInfo && (
        <div>
          <h2>Project Details:</h2>
          
          {/* Display Directory Tree Structure */}
          <h3>Directory Structure:</h3>
          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-auto font-mono text-sm">
            {repoInfo.treeStructure}
          </pre>

          {/* Display README Content */}
          <h3>README.md:</h3>
          <pre>{repoInfo.readmeContent}</pre>
          
          {/* Display Package JSON Content */}
          <h3>Package.json:</h3>
          <pre>{JSON.stringify(repoInfo.packageJson, null, 2)}</pre>

          {/* Display File Structure */}
          <h3>Project Directory Structure (Mermaid Diagram):</h3>
          <div className="mermaid" style={{ maxWidth: '100%', overflow: 'auto' }}>
            {generateMermaidDiagram(repoInfo.fileStructure)}
          </div>

          {/* Display Important Libraries */}
          <h3>Important Libraries:</h3>
          <h4>Dependencies:</h4>
          <ul>
            {repoInfo.importantLibraries.dependencies?.map((dep) => (
              <li key={dep.name}>
                {dep.name} (v{dep.version})
              </li>
            ))}
          </ul>

          <h4>Dev Dependencies:</h4>
          <ul>
            {repoInfo.importantLibraries.devDependencies?.map((dep) => (
              <li key={dep.name}>
                {dep.name} (v{dep.version})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RepoAnalyzer;
