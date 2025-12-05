import numpy
import torch
from torchvision import models, transforms
from safetensors.torch import load_file
from huggingface_hub import hf_hub_download
from PIL import Image



# 模型预设：把预训练/基础的 DenseNet121 改最后一层以适配 14 类多标签任务
class DenseNet121_CheXpert(torch.nn.Module):
    def __init__(self, num_labels=14, pretrained=False):
        super().__init__()
        self.densenet = models.densenet121(pretrained=pretrained)
        num_features = self.densenet.classifier.in_features
        self.densenet.classifier = torch.nn.Linear(num_features, num_labels)
    def forward(self, x):
        return self.densenet(x)

# 加载模型
REPO_ID = "itsomk/chexpert-densenet121"
FILENAME = "pytorch_model.safetensors"
local_path = r"G:\project\CXR_Analyzer\models\models--itsomk--chexpert-densenet121\snapshots\81be45e4d43011e8f50e17d002190c76cb069edd\pytorch_model.safetensors"
# local_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)
state = load_file(local_path)  
model = DenseNet121_CheXpert(num_labels=14, pretrained=False)
model.load_state_dict(state, strict=False)
model.eval()


# 数据预处理
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


# 推理
def confidence_dict(image_path:str):
    # 可能要修改一下输入，现在这里是通过访问图片地址后导入图片。
    img = Image.open(image_path).convert("RGB") # 从指定路径打开图片并将图片转换为RPG通道
    x = preprocess(img).unsqueeze(0)  
    with torch.no_grad():
        logits = model(x)
        probs = torch.sigmoid(logits).squeeze().tolist()

    results = {labels[i]: float(probs[i]) for i in range(len(labels))}
    return results


if __name__ == "__main__":
    import sys
    # image_path = sys.argv[1]  # 替换为你的图片路径
    image_path = r"G:\project\CXR_Analyzer\services\687754ce-7420bfd3-0a19911f-a27a3916-9019cd53.jpg"
    results = confidence_dict(image_path)
    for label, prob in results.items():
        print(f"{label}: {prob:.4f}")