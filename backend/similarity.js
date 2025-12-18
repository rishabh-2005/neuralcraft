import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";

async function getEmbedding(text) {
  try {
    console.log(`Checking similarity for: "${text}"`);

    // Using the endpoint you provided
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction`, 
      {
        headers: { 
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
        throw new Error(`HF API Error: ${response.statusText}`);
    }

    const result = await response.json();

    // 🛑 FIX: Hugging Face sometimes returns [[...]] and sometimes [...]
    // We flatten it to ensure we just have one array of numbers.
    let vector = result;
    if (Array.isArray(result) && Array.isArray(result[0])) {
        vector = result[0];
    }

    // 🛑 FIX: Use .length, not .size
    if (vector && vector.length > 0) {
        // console.log("Generated Embedding:", vector); // Uncomment to see data
        console.log("Generated Embedding size:", vector.length);
        return vector;
    } else {
        throw new Error("Unexpected embedding format");
    }

  } catch (error) {
    console.error("Embedding Generation Failed:", error.message);
    return null;
  }
}

export async function checkSimilarity(supabase, candidateName) {
  const vector = await getEmbedding(candidateName);
  
  if (!vector) {
    console.log("Could not generate vector. Assuming new.");
    // Return null vector so server knows to abort save
    return { isDuplicate: false, vector: null };
  }

  // Search Supabase for neighbors
  const { data: similarElements, error } = await supabase.rpc('match_elements', {
    query_embedding: vector,
    match_threshold: 0.80, // Strictness (0.90 - 0.95 is good)
    match_count: 1
  });

  if (error) {
    console.error("Vector Search Failed:", error.message);
    // If DB search fails, return vector so we can still save the element
    return { isDuplicate: false, vector: vector };
  }

  if (similarElements && similarElements.length > 0) {
    const match = similarElements[0];
    console.log(`Duplicate Found! "${candidateName}" ≈ "${match.name}"`);
    
    return { 
      isDuplicate: true, 
      existingId: match.id, 
      existingName: match.name,
      vector: vector 
    };
  }

  return { isDuplicate: false, vector: vector };
}