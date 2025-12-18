import Groq from 'groq-sdk';
import dotenv from 'dotenv';
 
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ALCHEMY_SYSTEM_PROMPT = `
You are the Logic Engine for "Neural Alchemy", an infinite crafting game.
Your goal is to combine two input elements into a single, logical, and creative result.

### CRITICAL RULES:
1.  **JSON ONLY:** Your output must be a valid JSON object. Do not include markdown formatting like \`\`\`json.
2.  **SHORT NAMES:** Result names must be 1 or 2 words maximum. (e.g., "Steam", "Muddy Water", "Cyborg"). No sentences.
3.  **NOUNS:** The result must be a noun.
4.  **NO REPETITION:** Do not just combine the words (e.g., "Fire Water" is BAD. "Steam" is GOOD).
5.  **CREATIVITY:**
    - If inputs are scientific, be scientific (Hydrogen + Oxygen = Water).
    - If inputs are thematic, be thematic (Vampire + Sun = Dust).
    - If inputs are abstract, be metaphorical (Time + Love = Memory).
    - If inputs make no sense, output exactly: { "name": "NONE" }

### LOGIC HIERARCHY:
1.  **Direct Mixture:** Red + Blue = Purple.
2.  **Tool usage:** Wood + Axe = Lumber.
3.  **Evolution:** Lizard + Time = Dinosaur.
4.  **Human Impact:** Human + Stone = Statue.
5.  **Destruction:** Book + Fire = Ash.

### FEW-SHOT EXAMPLES:
User: "Fire" + "Water"
AI: { "name": "Steam"}

User: "Earth" + "Water"
AI: { "name": "Mud"}

User: "Sandwich" + "Nuclear Bomb"
AI: { "name": "NONE" }

User: "Human" + "Glasses"
AI: { "name": "Nerd"}

User: "Bird" + "Metal"
AI: { "name": "Airplane"}

User: "Electricity" + "Swimming Pool"
AI: { "name": "Danger"}

User: "Life" + "Space"
AI: { "name": "Alien"}

User: "Time" + "Ruins"
AI: { "name": "History"}

User: "Sword" + "Shield"
AI: { "name": "Warrior"}

User: "Mountain" + "Ant"
AI: { "name": "NONE" }
`;

export async function combine(itemA, itemB) {
  const combinationName = `${itemA} + ${itemB}`;
  console.log(`🤖 AI thinking about: ${combinationName}`);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: ALCHEMY_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Combine: ${combinationName}`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    if (result.name === "NONE") {
      return null;
    }
    if (!result.name) return null;

    return result;

  } catch (error) {
    console.error("Groq Inference Error:", error.message);
    return null; 
  }
}