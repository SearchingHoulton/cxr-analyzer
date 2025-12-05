# # 执行visual ground,注意这里的输入是空,之后要加上
# def visual_grounding(image_bytes):
#     # 多个框和标签
#     bounding_boxes = [
#         [22, 110, 182, 186],   # 对应 0.055,0.275,0.455,0.466 假设图片 400x400
#         [200, 120, 320, 240],  # 对应 0.5,0.3,0.8,0.6
#         [80, 280, 160, 360]    # 对应 0.2,0.7,0.4,0.9
#     ]
#     labels = [
#         "There is a large right pleural effusion.",
#         "Small opacity left lung",
#         "Possible nodule lower region"
#     ]

#     grounding_results = {
#         "findings": []
#     }

#     for bbox, label in zip(bounding_boxes, labels):
#         grounding_results["findings"].append({
#             "label": label,
#             "bbox": bbox
#         })

#     return grounding_results


from pathlib import Path
import torch
from PIL import Image
import io
from services.model_load import get_grounding_model # 表框框模型



# ===================== Grounding 函数 =====================
def visual_grounding(image_bytes):
    # 从缓存中读取模型
    cache = get_grounding_model()
    model = cache["model"]
    processor = cache["processor"]
    device = cache["device"]

    # 将图片编码转换成图片
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # 构造 MAIRA 输入
    sample_data = {
        "frontal": image,
        "lateral": None,
        "indication": "Dyspnea.",
        "comparison": "None.",
        "technique": "PA and lateral views of the chest."
    }

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

    # # 转成返回格式（像素坐标）
    # grounding_results = {"findings": []}
    # w, h = image.size
    # for item in prediction:
    #     if isinstance(item, tuple) and len(item) == 2:
    #         label, bbox = item
    #         if bbox:
    #             bbox_pixel = [
    #                 int(bbox[0] * w),
    #                 int(bbox[1] * h),
    #                 int(bbox[2] * w),
    #                 int(bbox[3] * h)
    #             ]
    #         else:
    #             bbox_pixel = None
    #         grounding_results["findings"].append({
    #             "label": label,
    #             "bbox": bbox_pixel
    #         })
    # 转成返回格式（像素坐标）
    grounding_results = {"findings": []}
    w, h = image.size

    for item in prediction:
        if isinstance(item, tuple) and len(item) == 2:
            label, bbox = item
            bbox_pixel = None
            if bbox:
                # 展平 bbox
                flat_bbox = []
                for b in bbox:
                    if isinstance(b, (list, tuple)):
                        flat_bbox.extend(b)
                    else:
                        flat_bbox.append(b)
                # 只有长度为4才有效
                if len(flat_bbox) == 4:
                    bbox_pixel = [
                        int(flat_bbox[0] * w),
                        int(flat_bbox[1] * h),
                        int(flat_bbox[2] * w),
                        int(flat_bbox[3] * h)
                    ]
                else:
                    print(f"Skipping invalid bbox for label '{label}':", bbox)
            grounding_results["findings"].append({
                "label": label,
                "bbox": bbox_pixel
            })
    return grounding_results