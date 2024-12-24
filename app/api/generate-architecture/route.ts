import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { repoURL } = await req.json();

    console.log("Received repo URL:", repoURL);

    // Validate the repo URL
    if (typeof repoURL !== "string" || !repoURL.startsWith("https://github.com/")) {
      return NextResponse.json({ message: "Invalid repo URL" }, { status: 400 });
    }

    // Extract owner and repo from the URL
    const repoMatch = repoURL.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/|$)/);
    if (!repoMatch) {
      return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
    }

    const [, owner, repo] = repoMatch;

    console.log("Extracted owner:", owner);
    console.log("Extracted repo:", repo);

    // Fetch repository data from GitHub API
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoResponse = await axios.get(githubApiUrl);

    if (repoResponse.status !== 200) {
      throw new Error("Failed to fetch repository data from GitHub.");
    }

    const repoData = repoResponse.data;

    // Simulate architecture generation
    const architectureData = {
      repoName: repoData.name,
      owner: repoData.owner.login,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      license: repoData.license ? repoData.license.name : "No License",
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      openIssuesCount: repoData.open_issues_count,
      watchersCount: repoData.watchers_count,
      generatedDiagram: "https://dummy-architecture-diagram.com/diagram.png", // Example placeholder
    };

    console.log("Architecture Data:", architectureData);




    // Respond with generated architecture data
    return NextResponse.json(architectureData);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.message);
      return NextResponse.json(
        { message: error.response?.data?.message || "Failed to generate architecture. Please try again later." },
        { status: error.response?.status || 500 }
      );
    } else {
      console.error("Unexpected error:", error);
      return NextResponse.json(
        { message: "Failed to generate architecture. Please try again later." },
        { status: 500 }
      );
    }
  }
}