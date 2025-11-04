def classify_image(file):
    # 在这里做模型推理，这里的return只是测试数据
    return [
        {"observation": "Atelectasis", "confidence": 75, "present": True},
        {"observation": "Cardiomegaly", "confidence": 20, "present": False},
        {"observation": "Edema", "confidence": 10, "present": False},
        {"observation": "Consolidation", "confidence": 45, "present": True}
    ]