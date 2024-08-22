"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createFamilySearchClient } from "./familySearchClient";
import { fetchTreeData, generateExcel } from "./getTree";
import axios from "axios";

// Use environment variables
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;
const BASE_AUTH_URL = process.env.NEXT_PUBLIC_BASE_AUTH_URL;
const TOKEN_URL = process.env.NEXT_PUBLIC_TOKEN_URL;
const MAX_GENERATIONS = parseInt(
  process.env.NEXT_PUBLIC_MAX_GENERATIONS || "8",
  10
);

async function getAccessToken(code) {
  const requestData = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI!,
    code: code,
  });

  try {
    const response = await axios.post(TOKEN_URL!, requestData.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

export default function Component() {
  const [state, setState] = useState("initial");
  const [progress, setProgress] = useState(0);
  const [totalAncestors, setTotalAncestors] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [accessToken, setAccessToken] = useState("");

  const handleConnect = () => {
    setState("authenticating");
    // Redirect to FamilySearch authentication page
    window.location.href = `${BASE_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      REDIRECT_URI!
    )}`;
  };

  useEffect(() => {
    // Check if there's an authorization code in the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      setState("loading");
      getAccessToken(code)
        .then((token) => {
          setAccessToken(token);
          return fetchData(token);
        })
        .catch((error) => {
          console.error("Error getting access token:", error);
          setState("error");
        });
    }
  }, []);

  const fetchData = async (token) => {
    try {
      const { data, totalPeople } = await fetchTreeData(
        token,
        setProcessedCount,
        setTotalAncestors
      );
      generateExcel(data);
      setState("success");
    } catch (error) {
      console.error("Error fetching tree data:", error);
      setState("error");
    }
  };

  useEffect(() => {
    if (state === "loading") {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = (processedCount / totalAncestors) * 100;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [state, processedCount, totalAncestors]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            FamilySearch Connector
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state === "initial" && (
            <Button onClick={handleConnect} className="w-full">
              Connect to FamilySearch
            </Button>
          )}

          {state === "authenticating" && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Redirecting to FamilySearch authentication...</p>
            </div>
          )}

          {state === "loading" && (
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-center">
                Loading ancestors:{" "}
                {Math.floor((progress / 100) * totalAncestors)} out of{" "}
                {totalAncestors}
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-xl font-semibold">Download Complete!</p>
              <p>Successfully loaded {totalAncestors} ancestors.</p>
              <Button onClick={() => setState("initial")} className="w-full">
                Start Over
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
