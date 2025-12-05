
import torch
from PIL import Image
from services.model_load import get_classification_model # 表框框模型
from torchvision import transforms
import io

def classify_image(image_bytes):
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
    ])

    labels = [
    "No Finding","Enlarged Cardiomediastinum","Cardiomegaly","Lung Opacity",
    "Lung Lesion","Edema","Consolidation","Pneumonia","Atelectasis",
    "Pneumothorax","Pleural Effusion","Pleural Other","Fracture","Support Devices"
    ]

    # 将图片编码转换成图片
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = preprocess(img).unsqueeze(0)
    
    # 获得模型
    model = get_classification_model()

    # 前向推理
    with torch.no_grad():
        logits = model(x)
        probs = torch.sigmoid(logits).squeeze().tolist()

    # 构建和原来格式一致的返回
    results = []
    for i, label in enumerate(labels):
        prob = float(probs[i])
        results.append({
            "observation": label,
            "confidence": int(prob * 100),  # 转成百分比
            "present": prob > 0.5
        })
    return results