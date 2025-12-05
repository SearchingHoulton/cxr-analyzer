from qwen_vl_utils import process_vision_info
from PIL import Image
import io
from services.model_load import get_report_model # 视觉问答模型

def generate_report(image_bytes: bytes):
    """
    输入：
        image_bytes: 图像字节流
    返回：
        report: 模型生成的完整影像报告（字典格式）
    """
    try:
        # 读取图像
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 构造输入（让模型自动生成完整报告）
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": "Please generate a structured, detailed, and professional radiology report based on this chest X-ray image. The report should include: Findings: An objective description of the radiographic observations; Impression: A concise summary highlighting the key diagnostic considerations. Avoid making assumptions about the patient and do not add information that is not directly supported by the image."},
                ],
            }
        ]

        # 获取模型
        report_cache = get_report_model()
        model = report_cache["model"]
        processor = report_cache["processor"]

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
        ).to(model.device)

        # 模型生成
        generated_ids = model.generate(**inputs, max_new_tokens=200)
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = processor.batch_decode(
            generated_ids_trimmed,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0].strip()

        # 尝试结构化拆分报告（若模型输出格式较自由）
        findings, impression = None, None
        if "impression" in output_text.lower():
            # 常见分隔符提取
            parts = output_text.replace("：", ":").split("Impression:")
            if len(parts) == 2:
                findings = parts[0].split("Findings:")[-1].strip()
                impression = parts[1].strip()
            else:
                findings = output_text.strip()
        else:
            findings = output_text
        # print(f"findings: {findings} \n impression:{impression} \n output_text:{output_text}")
        return {
            "findings": findings or "",
            "impressions": impression or "",
            "raw_text": output_text
        }

    except Exception as e:
        return {"error": f"[VQA error] {str(e)}"}

# if __name__ == "__main__":
#     import time
#     test_path = r"G:\project\CXR_Analyzer\services\687754ce-7420bfd3-0a19911f-a27a3916-9019cd53.jpg"
#     with open(test_path, "rb") as f:
#         image_bytes = f.read()
#     print("图片读取了")
#     start = time.perf_counter()
#     report = generate_report(image_bytes)
#     end = time.perf_counter()     # 结束计时
#     print("\n=== 自动生成的放射学报告 ===")
#     print(report)
#     print(f"\n执行时间: {end - start:.4f} 秒")