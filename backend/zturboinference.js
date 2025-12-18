import dotenv from 'dotenv';
import { fal } from "@fal-ai/client";
dotenv.config();

export async function generateImage(element) {
    const prompt = `A 3D render icon of ${element}. Isometric view, smooth studio lighting, gentle gradients, isolated on a plain light pastel background. 3D illustration.`;
    console.log(`Generating image`);
    try {
        const result = await fal.subscribe("fal-ai/z-image/turbo", {
            input: { prompt: prompt, "image_size": {
                "width": 256,
                "height": 256
            } },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.log);
                }
            },
        });
        if (result.data && result.data.images && result.data.images.length > 0) {
            console.log(result.data.images[0].height);
            return result.data.images[0].url;
        } else {
            console.error("No images returned from Z-Turbo");
            return null;
        }
    } catch (error) {
        console.error("Z-Turbo Inference Error:", error.message);
        return null;
    }
}