import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { checkSimilarity } from './similarity.js';
import { combine } from './groqInference.js';
import { generateImage } from './zturboinference.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

console.log("Connected to Supabase and Groq");

function capitalizeFirstLetter(string) {
  if (typeof string !== 'string' || string.length === 0) {
    return '';
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function addToImages(imageUrl, filename) {
    try {
        console.log("Downloading from Fal...");
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log("Pm Uploading to Supabase Storage...");
        const path = `public/${filename}.png`;
        const { data, error } = await supabase
            .storage
            .from('icons')
            .upload(path, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        const { data: publicData } = supabase
            .storage
            .from('icons')
            .getPublicUrl(path);

        return publicData.publicUrl;
    } catch (err) {
        console.error("Storage Upload Error:", err.message);
        return null; // Fallback: return null if upload fails
    }
}

async function addToInventory(userId, elementId) {
    if(!userId || !elementId) {
        throw new Error("Invalid userId or elementId");
        return;
    }
    const { data, error } = await supabase
        .from('inventory')
        .insert({ user_id: userId, element_id: elementId})
        .select()
    
    if (error) {
        console.error("Error adding to inventory:", error);
        throw error;
    }
    console.log("Added to inventory:", data);
}

async function addToRecipes(eid1, eid2, rid) {
    const { data, error } = await supabase
        .from('recipes')
        .insert({ id_a: eid1, id_b: eid2, id_result: rid})
        .select()
    
    if (error) {
        console.error("Error adding to recipes:", error);
        throw error;
    }
    console.log("Added to recipes:", data);
}

async function addToElements(ename, embedding, userId, imageUrl) {
    if(!ename || !embedding) {
        throw new Error("Invalid element name or missing embedding vector");
    }
    const { data, error } = await supabase
        .from('elements')
        .insert({
            name: capitalizeFirstLetter(ename.toLowerCase()),
            embedding: embedding,
            discovered_by: userId,
            image_url: imageUrl
        })
        .select()
        .single(); 

    if (error) {
        console.error("Error adding to elements:", error);
        throw error;
    }
    
    return data; 
}

async function recipeExists(eid1, eid2) {
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id_a', eid1)
        .eq('id_b', eid2);
    
    if (data && data.length > 0) {
        console.log("Recipe exists:", eid1, "and", eid2);
        return true;
    }
    else return false;
}

async function existsInInventory(userId, elementId) {
    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userId)
        .eq('element_id', elementId);
    
    if (data && data.length > 0) {
        console.log("Element exists in inventory:", elementId, "for user :", userId);
        return true;
    }
    else return false;
}

async function elementExists(elementName) {
    const en = elementName.toLowerCase();

    const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('name', en);
    
    if (data && data.length > 0) {
        console.log("Element exists:", en);
        return true;
    }
    else return false;
}

app.post('/api/combine', async (req, res) => {
    let { userId, element1Id, element2Id } = req.body;
    if(!userId || !element1Id || !element2Id) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    try {
        const exists1 = await existsInInventory(userId, element1Id);
        const exists2 = await existsInInventory(userId, element2Id);
        console.log(exists1, exists2);
        if (!exists1 || !exists2) {
            return res.status(400).json({ error: 'One or both elements not in inventory' });
        }

        if(element1Id > element2Id){
            const temp = element1Id;
            element1Id = element2Id;
            element2Id = temp;
        }

        const { data: data1, error: error1 } = await supabase
            .from('elements')
            .select('name')
            .eq('id', element1Id)
            .single(); 
        if (error1 || !data1) return res.status(400).json({ error: "Element 1 not found" });
        const element1 = data1.name;
        const { data: data2, error: error2 } = await supabase
            .from('elements')
            .select('name')
            .eq('id', element2Id)
            .single();
        if (error2 || !data2) return res.status(400).json({ error: "Element 2 not found" });
        const element2 = data2.name;


        if(await recipeExists(element1Id, element2Id)){                                             // not a new recipe
            console.log("This is not a new element, already exists")
            const { data, error } = await supabase
                .from('recipes')
                .select('id_result')
                .eq('id_a', element1Id)
                .eq('id_b', element2Id);
            

            const resultId = data[0].id_result;
            if(!resultId){                                                                      // already tried before, cannot be combined
                console.log("elements cannot be combined")
                return res.status(200).json({ message: 'Elements cannot be combined' });
            }

            // 🟢 ADDED: Fetch details for existing element so frontend isn't blind
            const { data: existingData } = await supabase
                .from('elements')
                .select('name, image_url')
                .eq('id', resultId)
                .single();

            if(await existsInInventory(userId, resultId)){                                      // already unlocked
                console.log("Element already in inventory");
                // 🟢 UPDATED RETURN
                return res.status(200).json({ 
                    message: 'Element already in inventory', 
                    elementId: resultId,
                    elementName: existingData.name,
                    imageUrl: existingData.image_url 
                });
            }
            else{                                                                               // unlocked now
                await addToInventory(userId, resultId);
                console.log(`User ${userId} combined elements ${element1Id} and ${element2Id} to unlock element ${resultId}`);
                // 🟢 UPDATED RETURN
                return res.status(200).json({ 
                    message: 'Element added to inventory', 
                    elementId: resultId,
                    elementName: existingData.name,
                    imageUrl: existingData.image_url 
                });
            }
        }  
        else{                                                                                // new recipe
            console.log("Recipe doesn't exist");
            let aiResult; 

            try {
                // Try to get a result from AI
                aiResult = await combine(element1, element2);
            } catch (err) {
                // 🛑 CASE A: AI CRASHED
                console.error("💥 AI Generation Failed. Aborting save.");
                return res.status(500).json({ error: "AI Service Unavailable" });
            }
       
            // 🛑 CASE B: AI SAID "IMPOSSIBLE" (Returned null successfully)
            if (!aiResult) {
                console.log("elements cannot be combined")
                await addToRecipes(element1Id, element2Id, null);
                return res.status(200).json({ message: 'Elements cannot be combined' });
            }
            else{
                const ename = aiResult.name.toLowerCase();
                
                const {isDuplicate, existingId, vector} = await checkSimilarity(supabase, ename);
                
                if (!vector && !isDuplicate) {
                    console.log("Vector generation failed, cannot save.");
                    return res.status(500).json({ error: 'Vector generation failed' });
                }

                if (isDuplicate) {
                    // Case: The element exists in the GLOBAL database (e.g., ID 24)
                    console.log(`♻️ Element ${existingId} already exists in DB. Linking...`);
                    
                    // 1. Fetch details so we can return them
                    const { data: duplicateData } = await supabase
                        .from('elements')
                        .select('name, image_url')
                        .eq('id', existingId)
                        .single();

                    // 2. Always save the recipe (So 16 + 19 = 24 is remembered)
                    await addToRecipes(element1Id, element2Id, existingId);

                    // 3. 🛑 SAFETY CHECK: Only add to inventory if they don't have it yet!
                    const alreadyHasIt = await existsInInventory(userId, existingId);
                    
                    if (!alreadyHasIt) {
                        await addToInventory(userId, existingId);
                        console.log(`User ${userId} unlocked existing element ${existingId}`);
                        
                        return res.status(200).json({ 
                            message: 'Element added to inventory', 
                            elementId: existingId,
                            elementName: duplicateData.name,
                            imageUrl: duplicateData.image_url
                        });
                    } else {
                        console.log(`User ${userId} already has element ${existingId}`);
                        
                        // Return success (Recipe Unlocked) but don't crash
                        return res.status(200).json({ 
                            message: 'Recipe discovered (Element already owned)', 
                            elementId: existingId,
                            elementName: duplicateData.name,
                            imageUrl: duplicateData.image_url
                        });
                    }
                }
                else {
                    console.log("New unique element!");
                    
                    let permanentUrl = null;
                    
                    try {
                        const tempFalUrl = await generateImage(ename);
                        if(tempFalUrl) {
                            const filename = `${ename.replace(/\s+/g, '_')}_${Date.now()}`;
                            permanentUrl = await addToImages(tempFalUrl, filename);
                            console.log("Image saved at: " + permanentUrl);
                        }
                    } catch (e) {
                        console.error("Image generation failed", e);
                    }

                    const newElement = await addToElements(ename, vector, userId, permanentUrl);
                    const new_result_id = newElement.id;

                    console.log(`✨ ID Captured: ${new_result_id}`);

                    await addToRecipes(element1Id, element2Id, new_result_id);
                    await addToInventory(userId, new_result_id);
                    
                    console.log(`User ${userId} combined elements ${element1Id} and ${element2Id} to discover new element ${new_result_id}`);
                    
                    // 🟢 UPDATED RETURN
                    return res.status(200).json({ 
                        message: 'New element created and added to inventory', 
                        elementId: new_result_id,
                        elementName: newElement.name, // 👈 Send back the name
                        imageUrl: permanentUrl        // 👈 Send back the URL
                    });
                }
            }

        }
    }
    catch (error) {
        console.error('Error combining elements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/inventory/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // 1. Get all element IDs the user owns
        const { data: inventoryData, error: invError } = await supabase
            .from('inventory')
            .select('element_id')
            .eq('user_id', userId);
        
        if (invError) throw invError;
        
        // If empty, return empty array
        if (!inventoryData || inventoryData.length === 0) return res.json([]);

        // Extract IDs: [1, 2, 5, 8]
        const elementIds = inventoryData.map(item => item.element_id);

        // 2. Fetch details (Name, Image) for these IDs
        const { data: elementsData, error: elemError } = await supabase
            .from('elements')
            .select('id, name, image_url')
            .in('id', elementIds);
            
        if (elemError) throw elemError;

        // 3. Format matches Frontend expectation
        const formattedInventory = elementsData.map(e => ({
            id: e.id,
            name: e.name,
            image: e.image_url
        }));

        res.json(formattedInventory);
    } catch (error) {
        console.error("Fetch Inventory Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NeuralCraft Server running on port ${PORT}`));