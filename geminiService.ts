const API_BASE = "https://swan-umlr.onrender.com"; // backend URL

export const getDishRecommendation = async (mood: string) => {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood }),
  });
  return res.json();
};

export const askRestaurantAgent = async (question: string) => {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  return data.answer;
};

export const getLiveStatus = async () => {
  const res = await fetch(`${API_BASE}/api/status`);
  return res.json();
};
