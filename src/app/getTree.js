import FamilySearch from "fs-js-lite";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function createFamilySearchClient(accessToken) {
  console.log("Creating FamilySearch client with access token:", accessToken);
  return new FamilySearch({
    clientId: "b00VC7JDZH9EBLMP85GU", // Make sure this matches your CLIENT_ID
    accessToken: accessToken,
    environment: "beta",
    saveAccessToken: false,
  });
}

// Define MAX_GENERATIONS if not already defined
const MAX_GENERATIONS = 8; // or whatever value you prefer

export async function fetchTreeData(
  accessToken,
  setProcessedCount,
  setTotalCount
) {
  console.log("Fetching tree data with access token:", accessToken);
  const fs = createFamilySearchClient(accessToken);

  try {
    console.log("Getting current person ID...");
    const rootPersonId = await getCurrentPersonId(fs);
    console.log("Current person ID:", rootPersonId);

    console.log("Getting ancestry tree...");
    const tree = await getAncestryTree(fs, rootPersonId, MAX_GENERATIONS);
    console.log("Ancestry tree:", tree);

    const totalPeople = tree.persons.length;
    console.log("Total people in ancestry tree:", totalPeople);
    setTotalCount(totalPeople);

    const processPersonAndAncestors = async (person) => {
      try {
        const details = await getPersonDetails(fs, person.id);
        const locations = extractLocations(details.persons[0]);
        const { count, links } = await getMemoryCount(fs, person.id);

        const personData = {
          Name: person.display.name,
          Relationship: getRelationship(person.display.ascendancyNumber),
          Gender: person.display.gender,
          Lifespan: person.display.lifespan,
          ID: person.id,
          "Memory Count": count,
          "Memory Links": links.join(", "),
          "FamilySearch URL": getPersonUrl(person.id),
        };

        const personExcelData = [];

        if (locations.length === 0) {
          personData["Location Type"] = "No locations found";
          personData["Location"] = "";
          personData["Country"] = "";
          personData["Date"] = "";
          personExcelData.push(personData);
        } else {
          locations.forEach((loc, index) => {
            if (index === 0) {
              personData["Location Type"] = loc.type;
              personData["Location"] = loc.place;
              personData["Country"] = loc.country;
              personData["Date"] = loc.date;
              personExcelData.push(personData);
            } else {
              personExcelData.push({
                "Location Type": loc.type,
                Location: loc.place,
                Country: loc.country,
                Date: loc.date,
              });
            }
          });
        }

        setProcessedCount((prev) => prev + 1);
        return personExcelData;
      } catch (error) {
        console.error(`Error processing person ${person.id}:`, error.message);
        setProcessedCount((prev) => prev + 1);
        return [];
      }
    };

    const excelDataPromises = tree.persons.map(processPersonAndAncestors);
    const excelDataArrays = await Promise.all(excelDataPromises);
    const excelData = excelDataArrays.flat();

    return { data: excelData, totalPeople };
  } catch (error) {
    console.error("Error in fetchTreeData:", error);
    throw error;
  }
}

async function getCurrentPersonId(fs) {
  return new Promise((resolve, reject) => {
    fs.get("/platform/tree/current-person", (error, response) => {
      if (error) {
        console.error("Error getting current person:", error);
        reject(error);
      } else {
        console.log("Current person response:", response);
        const locationParts = response.headers.location.split("/");
        resolve(locationParts[locationParts.length - 1]);
      }
    });
  });
}

async function getAncestryTree(fs, personId, generations = MAX_GENERATIONS) {
  return new Promise((resolve, reject) => {
    const url = `/platform/tree/ancestry?person=${personId}&generations=${generations}`;
    fs.get(url, (error, response) => {
      if (error) {
        console.error("Error getting ancestry tree:", error);
        reject(error);
      } else {
        console.log("Ancestry tree response:", response);
        resolve(response.data);
      }
    });
  });
}

async function getPersonDetails(fs, personId) {
  return new Promise((resolve, reject) => {
    fs.get(`/platform/tree/persons/${personId}`, (error, response) => {
      if (error) {
        console.error("Error getting person details:", error);
        reject(error);
      } else {
        console.log("Person details response:", response);
        resolve(response.data);
      }
    });
  });
}

async function getMemoryCount(fs, personId) {
  return new Promise((resolve, reject) => {
    fs.get(`/platform/tree/persons/${personId}/memories`, (error, response) => {
      console.log(`Memory response for person ${personId}:`, response);
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
                (memory) =>
                  `https://www.familysearch.org/photos/artifacts/${memory.id}`
              )
            : [];
        resolve({ count: memoryCount, links: memoryLinks });
      }
    });
  });
}

function extractLocations(person) {
  const usStates = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];

  function getCountry(placeParts) {
    if (placeParts.length > 1) {
      const lastPart = placeParts[placeParts.length - 1];
      const secondLastPart = placeParts[placeParts.length - 2];

      if (lastPart === "United States" || lastPart === "USA") {
        return "United States";
      }
      if (usStates.includes(lastPart) || usStates.includes(secondLastPart)) {
        return "United States";
      }
      // Check for cases like "Utah, United States"
      if (lastPart.includes("United States")) {
        return "United States";
      }
      return lastPart;
    }
    return "Unknown";
  }

  const locations = [];
  if (person.facts) {
    person.facts.forEach((fact) => {
      if (fact.place && fact.place.original) {
        const placeParts = fact.place.original.split(", ");
        const country = getCountry(placeParts);
        locations.push({
          type: fact.type.replace("http://gedcomx.org/", ""),
          place: fact.place.original,
          country: country,
          date: fact.date ? fact.date.original : "Unknown",
        });
      }
    });
  }
  return locations;
}

function getRelationship(ascendancyNumber) {
  switch (ascendancyNumber) {
    case "1":
      return "Self";
    case "2":
      return "Father";
    case "3":
      return "Mother";
    case "4":
      return "Paternal Grandfather";
    case "5":
      return "Paternal Grandmother";
    case "6":
      return "Maternal Grandfather";
    case "7":
      return "Maternal Grandmother";
    default:
      return "Unknown";
  }
}

function getPersonUrl(personId) {
  return `https://www.familysearch.org/tree/person/details/${personId}`;
}

export function generateExcel(data) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Ancestry Tree");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(dataBlob, "ancestry_tree.xlsx");
}

async function fetchParents(fs, personId) {
  return new Promise((resolve, reject) => {
    fs.get(`/platform/tree/persons/${personId}/parents`, (error, response) => {
      if (error) {
        console.error("Error fetching parents:", error);
        resolve([]); // Return an empty array if there's an error
      } else {
        const parents =
          response.data && response.data.persons ? response.data.persons : [];
        resolve(parents);
      }
    });
  });
}
