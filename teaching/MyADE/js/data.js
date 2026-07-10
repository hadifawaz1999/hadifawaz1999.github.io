const DATA_URL = "./data/courses_complete.json";

export async function loadDatabase() {
  const response = await fetch(DATA_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL} (HTTP ${response.status}).`);
  }

  const database = await response.json();
  validateDatabase(database);
  return database;
}

function validateDatabase(database) {
  if (!database || typeof database !== "object") {
    throw new Error("The JSON root must be an object.");
  }

  if (!database.courses || typeof database.courses !== "object") {
    throw new Error("The JSON must contain a 'courses' object.");
  }

  if (!Array.isArray(database.sessions)) {
    throw new Error("The JSON must contain a 'sessions' array.");
  }
}
