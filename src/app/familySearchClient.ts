import FamilySearch from "fs-js-lite";

export function createFamilySearchClient(accessToken: string): FamilySearch {
  console.log("Creating FamilySearch client with access token:", accessToken);
  return new FamilySearch({
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    accessToken: accessToken,
    environment: "beta",
    saveAccessToken: false,
  });
}

export async function getCurrentPersonId(fs: FamilySearch): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.get(
      "/platform/tree/current-person",
      (error: Error | null, response: any) => {
        if (error) {
          console.error("Error getting current person:", error);
          reject(error);
        } else {
          console.log("Current person response:", response);
          const locationParts = response.headers.location.split("/");
          resolve(locationParts[locationParts.length - 1]);
        }
      }
    );
  });
}

export async function getAncestryTree(
  fs: FamilySearch,
  personId: string,
  generations: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.get(
      `/platform/tree/ancestry?person=${personId}&generations=${generations}`,
      (error: Error | null, response: any) => {
        if (error) {
          console.error("Error getting ancestry tree:", error);
          reject(error);
        } else {
          console.log("Ancestry tree response:", response);
          resolve(response.data);
        }
      }
    );
  });
}

export async function getPersonDetails(
  fs: FamilySearch,
  personId: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.get(
      `/platform/tree/persons/${personId}`,
      (error: Error | null, response: any) => {
        if (error) {
          console.error("Error getting person details:", error);
          reject(error);
        } else {
          console.log("Person details response:", response);
          resolve(response.data);
        }
      }
    );
  });
}

interface MemoryCountResult {
  count: number | "N/A";
  links: string[];
}

export async function getMemoryCount(
  fs: FamilySearch,
  personId: string
): Promise<MemoryCountResult> {
  return new Promise((resolve) => {
    fs.get(
      `/platform/tree/persons/${personId}/memories`,
      (error: Error | null, response: any) => {
        if (error) {
          console.error("Error fetching memory count:", error);
          resolve({ count: "N/A", links: [] });
        } else {
          console.log("Memory count response:", response);
          const memoryCount =
            response.data && response.data.sourceDescriptions
              ? response.data.sourceDescriptions.length
              : 0;
          const memoryLinks =
            response.data && response.data.sourceDescriptions
              ? response.data.sourceDescriptions.map(
                  (memory: any) =>
                    `https://www.familysearch.org/photos/artifacts/${memory.id}`
                )
              : [];
          resolve({ count: memoryCount, links: memoryLinks });
        }
      }
    );
  });
}
