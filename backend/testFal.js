import { generateImage } from './zturboinference.js';

async function test() {
    console.log("🚀 Starting Image Gen Test...");
    
    const imageUrl = await generateImage("Dragon");
    
    if (imageUrl) {
        console.log("\n✅ Success! Image URL:");
        console.log(imageUrl);
    } else {
        console.log("\n❌ Failed to generate image.");
    }
}

test();