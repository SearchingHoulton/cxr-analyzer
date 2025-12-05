#!/usr/bin/env python
# coding: utf-8



from qwen_vl_utils import process_vision_info
from PIL import Image
import io



# 封装函数供 Flask 调用
def vqa(image_bytes: bytes, question: str) -> str:
    """
    输入：
        image_bytes: 图像字节流（来自 Flask 上传）
        question: 用户提问（str）
    返回：
        answer: 模型回答（str）
    """
    try:
        # 字节流转 PIL.Image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 构造输入格式
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": question},
                ],
            }
        ]

        # 应用模板
        text = processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)

        # 构造模型输入
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        inputs = inputs.to(model.device)

        # 生成回答
        generated_ids = model.generate(**inputs, max_new_tokens=512)
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )
        return output_text[0].strip()

    except Exception as e:
        return f"[VQA error] {str(e)}"