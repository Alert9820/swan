// src/services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { MENU_ITEMS, RESTAURANT_INFO } from "../constants";

// ✅ Vite-safe API key access
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ Initialize AI only if key exists
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// --- 1. Dish Recommendation ---
export const getDishRecommendation = async (userMood: string) => {
  if (!ai) {
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
      contents: `You are a knowledgeable server at "Swan Oyster Depot", a historic seafood counter in San Francisco since 1912.
      
Key Traits:
1. We are famous for fresh seafood, especially Crab Back and Oysters.
2. We are CASH ONLY.
3. The atmosphere is casual, no-frills, and historic.
4. We do not take reservations.
      
Menu:
${menuContext}

Customer Mood: "${userMood}"

Task: Recommend 1-3 dishes.
Output: JSON only.`,
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

    if (response.text) return JSON.parse(response.text);
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      recommendationText: "You can't go wrong with our Mixed Oysters.",
      recommendedDishIds: ["1"],
    };
  }
};

// --- 2. General Agent (Conversational) ---
export const askRestaurantAgent = async (question: string) => {
  if (!ai) {
    return (
      "I can't connect to live maps right now, but we are located at " +
      RESTAURANT_INFO.address
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User Question: "${question}"
      
Context: You are the concierge at "Swan Oyster Depot" located at 1517 Polk St, San Francisco, CA.
Important Info: We are CASH ONLY. We are closed on Sundays. We are open Mon-Sat 8am-2:30pm.

Use Google Maps to find the answer if it relates to location, traffic, or nearby places.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    let answer = response.text || "I couldn't find that information.";

    const groundingMetadata =
      response.candidates?.[0]?.groundingMetadata;

    if (groundingMetadata?.groundingChunks?.length) {
      answer += `\n\n(Source: Google Maps)`;
    }

    return answer;
  } catch (error) {
    console.error("Maps Agent Error:", error);
    return
      "I am currently having trouble accessing the map satellites. Note that we are open Mon-Sat until 2:30 PM.";
  }
};

// --- 3. Live Dashboard Status ---
export const getLiveStatus = async () => {
  if (!ai) {
    return {
      text: "Live satellite feed unavailable. Expect the usual line!",
      source: null,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `What is the current traffic situation around Swan Oyster Depot (1517 Polk St, SF) right now?
Use Google Maps to verify traffic on Polk Street.

Task: Provide a short, punchy status update (max 30 words).
Format: "🚦 Traffic: [Heavy/Light]. 📍 Vibe: [Description]."`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text =
      response.text || "Traffic info currently unavailable.";

    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    let source = null;
    if (chunks) {
      const mapChunk = chunks.find((c: any) => c.maps?.uri);
      if (mapChunk) source = mapChunk.maps.uri;
    }

    return { text, source };
  } catch (error) {
    console.error("Live Status Error:", error);
    return {
      text: "Unable to connect to live satellites. Assume a wait exists!",
      source: null,
    };
  }
};
