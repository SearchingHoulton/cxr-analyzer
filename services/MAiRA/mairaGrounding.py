from transformers import AutoModelForCausalLM, AutoProcessor
from accelerate import init_empty_weights, load_checkpoint_and_dispatch
from pathlib import Path
import torch
import requests
from PIL import Image

# ===================== 1. 配置模型路径与设备 =====================
local_model_path = Path("./maira-data")  # 替换为你的本地模型路径
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")  # 自动选择设备（优先GPU，否则CPU）

# ===================== 2. 加载处理器与模型 =====================
processor = AutoProcessor.from_pretrained(
    local_model_path,
    trust_remote_code=True
)

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
    device_map="auto",
    no_split_module_classes=["Maira2DecoderLayer"],
    dtype=torch.float16
)

model.eval()
print("模型设备分配：", model.hf_device_map)

# ===================== 3. 下载示例医疗图像 =====================
def get_sample_data() -> dict[str, Image.Image | str]:
    frontal_image_url = "https://openi.nlm.nih.gov/imgs/512/145/145/CXR145_IM-0290-1001.png"
    lateral_image_url = "https://openi.nlm.nih.gov/imgs/512/145/145/CXR145_IM-0290-2001.png"

    def download_and_open(url: str) -> Image.Image:
        response = requests.get(url, headers={"User-Agent": "MAIRA-2"}, stream=True)
        return Image.open(response.raw)

    frontal_image = download_and_open(frontal_image_url)
    lateral_image = download_and_open(lateral_image_url)

    return {
        "frontal": frontal_image,
        "lateral": lateral_image,
        "indication": "Dyspnea.",
        "comparison": "None.",
        "technique": "PA and lateral views of the chest.",
        "phrase": "Pleural effusion."
    }

sample_data = get_sample_data()

# ===================== 4. 预处理输入并推理 =====================
processed_inputs = processor.format_and_preprocess_reporting_input(
    current_frontal=sample_data["frontal"],
    current_lateral=sample_data["lateral"],
    prior_frontal=None,
    indication=sample_data["indication"],
    technique=sample_data["technique"],
    comparison=sample_data["comparison"],
    prior_report=None,
    return_tensors="pt",
    get_grounding=True,
)

# 将所有输入张量移至指定设备
processed_inputs = {k: v.to(device) for k, v in processed_inputs.items()}

with torch.no_grad():
    output_decoding = model.generate(
        **processed_inputs,
        max_new_tokens=100,
        use_cache=True,
    )

prompt_length = processed_inputs["input_ids"].shape[-1]
decoded_text = processor.decode(output_decoding[0][prompt_length:], skip_special_tokens=True).lstrip()
prediction = processor.convert_output_to_plaintext_or_grounded_sequence(decoded_text)
print("解析后的预测报告：", prediction)