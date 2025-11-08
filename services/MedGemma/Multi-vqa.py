#!/usr/bin/env python
# coding: utf-8

# In[2]:


import os
import json
import base64
from PIL import Image
from transformers import pipeline
import torch
#加载模型
_pipe = None
def get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = pipeline(
            "image-text-to-text",
            model=r"F:\7008project\medgemma",   
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
    return _pipe
pipe = get_pipe()


# In[ ]:


# 核心多轮 VQA 函数
def vqa(image_bytes: bytes, question: str, folder_name: str) -> str:##########需要在app.py新加一个参数folder_name
    """
    image_bytes : 前端上传的图片二进制
    question    : 当前轮次问题
    folder_name : 图片名（不含后缀），也即 outputs 下的文件夹名
    return      : 当前轮次答案
    """
    image = Image.open(io.BytesIO(image_bytes))

    #读取历史问答
    result_json = os.path.join("static/outputs", folder_name, "result.json")
    history = data.get("all", [{}])[0].get("vqa", []) 
    if os.path.exists(result_json):
        with open(result_json, "r", encoding="utf-8") as f:
            data = json.load(f)
            history = data.get("vqa", [])      

    #构造 messages
    messages = [
        {"role": "system", "content": [{"type": "text", "text": "You are an expert radiologist."}]}
    ]
    # 追加历史
    for qa in history:
        messages.append({
            "role": "user",
            "content": [{"type": "text", "text": qa["question"]},
                        {"type": "image", "image": image}]   # 每轮都把同一张图再送一次？？
        })
        messages.append({
            "role": "assistant",
            "content": [{"type": "text", "text": qa["answer"]}]
        })

    # 追加当前新问题
    messages.append({
        "role": "user",
        "content": [{"type": "text", "text": question},
                    {"type": "image", "image": image}]
    })

    # 调模型
    output = pipe(text=messages, max_new_tokens=200)
    answer = output[0]["generated_text"][-1]["content"]
    return answer

