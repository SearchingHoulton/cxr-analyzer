import torch
from transformers import AutoModelForCausalLM, AutoProcessor, pipeline
from accelerate import init_empty_weights, load_checkpoint_and_dispatch
from safetensors.torch import load_file
from torchvision import models, transforms
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

# 全局缓存
model_cache = {}

# --------------------- 分类模型 ---------------------
def get_classification_model():
    class DenseNet121_CheXpert(torch.nn.Module):
        def __init__(self, num_labels=14, pretrained=False):
            super().__init__()
            self.densenet = models.densenet121(pretrained=pretrained)
            num_features = self.densenet.classifier.in_features
            self.densenet.classifier = torch.nn.Linear(num_features, num_labels)
        def forward(self, x):
            return self.densenet(x)
    if 'classification' not in model_cache:
        MODEL_PATH = "./models/models--itsomk--chexpert-densenet121/snapshots/81be45e4d43011e8f50e17d002190c76cb069edd/pytorch_model.safetensors"
        state = load_file(MODEL_PATH)  # 加载权重
        model = DenseNet121_CheXpert(num_labels=14, pretrained=False)
        model.load_state_dict(state, strict=False)
        model.eval()
        model_cache['classification'] = model
    return model_cache['classification']

# --------------------- 接地模型 ---------------------
def get_grounding_model():
    if 'grounding' not in model_cache:
        # local_model_path = Path(r"G:\project\CXR_Analyzer\models\Maira-2")
        local_model_path = './models/Maira-2'
        # device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        device = "cpu"
        processor = AutoProcessor.from_pretrained(local_model_path, trust_remote_code=True)
        with init_empty_weights():
            model = AutoModelForCausalLM.from_pretrained(
                local_model_path,
                trust_remote_code=True,
                torch_dtype=torch.float16,
                device_map=None
            )
        model = load_checkpoint_and_dispatch(
            model,
            checkpoint=local_model_path,
            # device_map="auto",
            device_map={"": "cpu"},
            no_split_module_classes=["Maira2DecoderLayer"],
            dtype=torch.float16
        )
        model.eval()
        model_cache['grounding'] = {
            "model": model,
            "processor": processor,
            "device": device
        }
    return model_cache['grounding']

# --------------------- 报告生成模型 ---------------------
def get_report_model():
    if 'report' not in model_cache:
        # 加载模型（
        MODEL_PATH = "./models/Lingshu-7B"
        print("[VQA] loading...")
        model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
        # processor = AutoProcessor.from_pretrained(MODEL_PATH)
        model_cache['report'] = {
            "model": model,
            "processor":AutoProcessor.from_pretrained(MODEL_PATH)
        }
    return model_cache['report']

# --------------------- VQA 模型 ---------------------
def get_vqa_model():
    if 'vqa' not in model_cache:
        model_cache['vqa'] = pipeline(
            "image-text-to-text",
            model='./models/Medgemma',
            torch_dtype=torch.bfloat16,
            device_map='cpu'
        )
    return model_cache['vqa']