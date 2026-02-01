import { GoogleGenAI, Type } from "@google/genai";
import { MENU_ITEMS, RESTAURANT_INFO } from "./constants.js";

// Gemini init (API key Render / env se aayegi)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* -------------------------------------------------
   1. Dish Recommendation
-------------------------------------------------- */
export const getDishRecommendation = async (userMood = "hungry") => {
  // Fallback (agar API key na ho)
  if (!process.env.GEMINI_API_KEY) {
    return {
      recommendationText:
        "For a classic Swan's experience, I highly recommend the Dungeness Crab Back or the Mixed Dozen Oysters.",
      recommendedDishIds: ["2", "1"],
    };
  }

  const menuContext = MENU_ITEMS.map(
    (item) =>
      `${item.id}: ${item.name} (${item.category}) - ${item.description}. Tags: ${
        item.isVegetarian ? "Veg" : "Non-Veg"
      }.`
  ).join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
You are a knowledgeable server at "Swan Oyster Depot", a historic seafood counter in San Francisco since 1912.

Key Facts:
- Famous for fresh seafood (Crab Back & Oysters)
- CASH ONLY
- No reservations

Menu:
${menuContext}

Customer Mood: "${userMood}"

Task:
Recommend 1–3 dishes.

Output:
JSON only.
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendationText: { type: Type.STRING },
            recommendedDishIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error("Gemini Recommendation Error:", err);
    return {
      recommendationText: "You can't go wrong with our Mixed Oysters.",
      recommendedDishIds: ["1"],
    };
  }
};

/* -------------------------------------------------
   2. Restaurant Chat / Concierge
-------------------------------------------------- */
export const askRestaurantAgent = async (question = "") => {
  if (!process.env.GEMINI_API_KEY) {
    return `We are located at ${RESTAURANT_INFO.address}. Note: We are cash only.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
User Question: "${question}"

Context:
You are the concierge at "Swan Oyster Depot"
Address: 1517 Polk St, San Francisco, CA
Hours: Mon–Sat, 8:00 AM – 2:30 PM
Closed: Sunday
Payment: CASH ONLY

Use Google Maps if the question is about location, traffic, or nearby places.
`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    return response.text || "Sorry, I couldn't find that information.";
  } catch (err) {
    console.error("Gemini Chat Error:", err);
    return "Service temporarily unavailable. Please try again later.";
  }
};

/* -------------------------------------------------
   3. Live Traffic / Status Dashboard
-------------------------------------------------- */
export const getLiveStatus = async () => {
  if (!process.env.GEMINI_API_KEY) {
    return {
      text: "🚦 Traffic: Unknown. 📍 Vibe: Expect the usual line.",
      source: null,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
Check current traffic near Swan Oyster Depot (1517 Polk St, San Francisco).

Task:
Give a short dashboard update (max 30 words).

Format:
"🚦 Traffic: [Heavy/Moderate/Light]. 📍 Vibe: [Short description]."
`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    return {
      text: response.text || "Traffic info currently unavailable.",
      source: null,
    };
  } catch (err) {
    console.error("Gemini Live Status Error:", err);
    return {
      text: "Unable to connect to live traffic data. Assume a wait.",
      source: null,
    };
  }
};
