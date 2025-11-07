#!/usr/bin/env python
# coding: utf-8

# In[ ]:


"""
VQA 服务：MedGemma 回答自然语言问题
"""
from transformers import pipeline
from PIL import Image
import torch
import io

# ------------------------------------------------------------------
# 1. 全局加载一次模型（生产环境建议用 lru_cache 或懒加载）
# ------------------------------------------------------------------
pipe = pipeline(
    "image-text-to-text",
    model=r"modelpath",  ######
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# ------------------------------------------------------------------
# 2. 暴露给 Flask 的入口函数
#    参数：image_bytes  ←  request.files['image'].read()
#          question     ←  form 里的 question
# ------------------------------------------------------------------
def vqa(image_bytes: bytes, question: str) -> str:
    # bytes → PIL
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    messages = [
        {
            "role": "system",
            "content": [{"type": "text", "text": "You are an expert radiologist."}]
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {"type": "image", "image": image}
            ]
        }
    ]

    output = pipe(text=messages, max_new_tokens=300)
    # MedGemma 返回格式：List[Dict] → 取最后一条 assistant 内容
    answer = output[0]["generated_text"][-1]["content"]
    return answer

