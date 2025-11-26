import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ArtConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    colors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of hex color codes. MUST be grayscale/monochrome (e.g., #000000, #333333, #808080)."
    },
    speed: {
      type: Type.NUMBER,
      description: "Flow speed. Higher = more intense smear. 1.0 (slow melt) to 5.0 (rapid wind)."
    },
    chaos: {
      type: Type.NUMBER,
      description: "Waviness of the trail. 0.001 (straight lines) to 0.01 (very wavy)."
    },
    blurLevel: {
      type: Type.NUMBER,
      description: "Trail length. 0.05 (very long trails) to 0.3 (shorter trails)."
    },
    particleCount: {
      type: Type.INTEGER,
      description: "Density. 2000 (sparse) to 5000 (solid ink look)."
    },
    flowAngle: {
      type: Type.NUMBER,
      description: "Direction of flow in degrees. 0 = Right, 90 = Down, 180 = Left, 270 = Up. Choose based on emotion."
    },
    moodDescription: {
      type: Type.STRING,
      description: "A very short, poetic 2-word description of the text's vibe (e.g. 'DARK MATTER')."
    }
  },
  required: ["colors", "speed", "chaos", "blurLevel", "particleCount", "flowAngle", "moodDescription"]
};

export const generateArtConfig = async (input: string): Promise<ArtConfig> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this text and generate configuration parameters for a black-and-white fluid art simulation. Text: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert abstract artist specializing in monochrome, high-contrast, slit-scan style digital art. The user wants a 'black and white' effect. Always return colors in grayscale (#000000 to #333333) regardless of the text emotion. Use speed, chaos, and FLOW DIRECTION to express the emotion.",
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as ArtConfig;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback config
    return {
      colors: ["#000000", "#222222", "#444444"],
      speed: 2,
      chaos: 0.003,
      blurLevel: 0.1,
      particleCount: 3000,
      flowAngle: 0,
      moodDescription: "Monochrome"
    };
  }
};