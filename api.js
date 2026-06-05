const BASE_URL = "http://localhost:3000";

// CHAT
export async function chat(message) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  return res.json();
}

// SCOUT
export async function scout(data) {
  const res = await fetch(`${BASE_URL}/api/scout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
}

// GUARDIAN
export async function guardian(data) {
  const res = await fetch(`${BASE_URL}/api/guardian`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
}