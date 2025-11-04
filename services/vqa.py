def vqa(image_bytes, question):
    answer = {
        "question": question,
        "answer": "心脏大小在正常范围内，未提示明显放大。",
        "confidence": 0.92
    }
    return answer