# 执行visual ground,注意这里的输入是空,之后要加上
def visual_grounding(image_bytes):
    # 多个框和标签
    bounding_boxes = [
        [22, 110, 182, 186],   # 对应 0.055,0.275,0.455,0.466 假设图片 400x400
        [200, 120, 320, 240],  # 对应 0.5,0.3,0.8,0.6
        [80, 280, 160, 360]    # 对应 0.2,0.7,0.4,0.9
    ]
    labels = [
        "There is a large right pleural effusion.",
        "Small opacity left lung",
        "Possible nodule lower region"
    ]

    grounding_results = {
        "findings": []
    }

    for bbox, label in zip(bounding_boxes, labels):
        grounding_results["findings"].append({
            "label": label,
            "bbox": bbox
        })

    return grounding_results