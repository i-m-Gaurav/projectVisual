'use client'
import React, { useState } from "react";
import axios from "axios";

const Landing = () => {
  const [repoURL, setRepoURL] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!repoURL.trim()) {
      alert("Enter a valid Github repo URL!");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/generate-architecture", {
        repoURL,
      });

      console.log("Architecture data : ", response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data?.message || "Something went wrong.");
      } else {
        console.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        className="text-black w-[400px]"
        type="url"
        value={repoURL}
        onChange={(e) => setRepoURL(e.target.value)}
        placeholder="Enter Github repo URL"
      />

      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-6 py-2 rounded-lg shadow-md text-white ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-500 transition"
        }`}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
};

export default Landing;
