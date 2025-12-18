import os
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

url = "https://woxppudwpiacjfaphvmj.supabase.co"
key = "sb_secret_PC6YBz3vk2nJ_2K4SDPBAg_kzQFCppQ"
supabase: Client = create_client(url, key)
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

bases = ["Fire", "Water", "Air", "Earth"]
def seed():
    i = 1
    for element in bases:
        embedding = model.encode(element)
        embedding_list = embedding.tolist()
        print(embedding.shape)
        data = {
            "id" : i,
            "name" : element,
            "is_base_element" : True,
            "image_url" : None,
            "embedding" : embedding_list
        }
        response = supabase.table("elements").upsert(data).execute()
        print(f"saved {element}")
        i += 1

if __name__ == "__main__":
    seed()