from PIL import Image
import os
import sys
import json
import torch
from services.model_load import get_vqa_model # 视觉问答模型
import io

def get_MedGemma_vqa(image_bytes: bytes, question: str, folder_name: str) -> str:
    image = Image.open(io.BytesIO(image_bytes))

    result_json = os.path.join("static/outputs", folder_name, "result.json")
    history = []
    print(result_json)
    if os.path.exists(result_json):
        with open(result_json, "r", encoding="utf-8") as f:
            data = json.load(f)
            history = data.get("vqa", {}).get("items", [])

    messages = [
        {"role": "system", "content": [{"type": "text", "text": "You are an expert radiologist."}]}
    ]

    # 追加历史问答
    if history:
        for item in history:
            prev_q = item.get("question", "")
            prev_a = item.get("answer", "")
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prev_q},
                    {"type": "image", "image": image}
                ]
            })
            messages.append({
                "role": "assistant",
                "content": [
                    {"type": "text", "text": prev_a}
                ]
            })

    messages.append({
        "role": "user",
        "content": [{"type": "text", "text": question},
                    {"type": "image", "image": image}]
    })
    pipe = get_vqa_model()
    output = pipe(text=messages, max_new_tokens=200)
    answer = output[0]["generated_text"][-1]["content"]
    return answer