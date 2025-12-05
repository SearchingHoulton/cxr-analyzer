from flask import Flask, render_template, request, jsonify, send_from_directory
import uuid, os, time, json, base64, shutil
from datetime import datetime
from services.classify import classify_image # 交互式分类路由
from services.grounding import visual_grounding # 视觉接地路由
from services.generate_report import generate_report # 自动生成报告路由
from services.vqa import get_MedGemma_vqa # 视觉问答路由
from PIL import Image
import io

app = Flask(
    __name__,
    static_folder='static',
    template_folder='templates'
)

# 开发模式：自动刷新模板
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.auto_reload = True

# 静态文件防缓存（开发用）
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# 初始化、配置和通用说明（全局设置部分）
UPLOAD_DIR = 'static/uploads'
OUTPUT_DIR = "static/outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 首页路由，加载网页
@app.route('/')
def index():
    #   加时间戳防止 JS/CSS 被缓存
    return render_template('index.html', timestamp=int(time.time()))

# 交互式分类路由：对上传的图像运行分类模型，并检测是否存在 CheXpert [7]） 定义的 14 个观测值及其相应的置信度分数。
# 用到的地方：classification.js
@app.route('/classify', methods=['POST'])
def classify_route():
    # 获取图片
    image_file = request.files['image']  # Flask 接收上传文件
    image_bytes = image_file.read()
    # 调用图像分类模型，返回14个观测值和相应的置信度分数
    results = classify_image(image_bytes)  
    return jsonify(results) 

# 视觉接地路由：可视化 X 射线上关键发现的位置，例如，通过在结节周围绘制边界框或在巩固区域创建分割掩模
# 用到的地方：ground.js
@app.route('/grounding', methods=['POST'])
def grounding_route():
    # 获取图片
    image_file = request.files['image']  # Flask 接收上传文件
    image_bytes = image_file.read()
    # 调用模型获取关键区域
    grounding_results = visual_grounding(image_bytes)
    return jsonify(grounding_results)

# 自动生成报告路由：使用调查中的报告生成模型之一为图像生成放射学报告草案（例如，“结果”部分）
# 用到的地方：report.js
@app.route('/generate-report', methods=['POST'])
def generate_report_route():
    # 获取图片
    image_file = request.files['image']  # Flask 接收上传文件
    image_bytes = image_file.read()
    # 调用报告生成模型
    report = generate_report(image_bytes)
    return jsonify(report)

# 视觉问答路由：实现一个简单的界面，用户可以在其中用自然语言询问有关图像的问题（例如，“心脏是否放大？）
# 用到的地方：vqa.js
@app.route('/vqa', methods=['POST'])
def visual_question_answering_route():
    file = request.files.get('image')
    # 获取图片
    image_file = request.files['image']  # Flask 接收上传文件
    image_bytes = image_file.read()
    # 获取问题
    question = request.form.get('question')
    # 获取文件名
    filename = file.filename
    folder_name = os.path.splitext(filename)[0]  # 去掉后缀名作为 folder_name
    # 调用VQA模型处理问题
    answer = get_MedGemma_vqa(image_bytes, question, folder_name)
    return jsonify({"answer": answer})

# ============ 其他操作：创建存储文件夹 ============

# 创建文件夹
@app.route('/create_folder', methods=['POST'])
def create_folder():
    data = request.get_json()
    folder_name = data.get("folder")
    file_name = data.get("filename")
    file_data = data.get("data")  # base64 图片数据

    if not folder_name:
        return jsonify({"success": False, "error": "Folder name missing"}), 400

    folder_path = os.path.join(OUTPUT_DIR, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    if file_name and file_data:
        # 保存图片
        image_path = os.path.join(folder_path, file_name)
        with open(image_path, 'wb') as f:
            f.write(base64.b64decode(file_data))

    return jsonify({"success": True, "path": folder_path})

# 保存分析结果
@app.route('/save_result', methods=['POST'])
def save_result():
    data = request.get_json()
    folder_name = data.get('folder')
    result_type = data.get('type')
    result_data = data.get('data')

    if not folder_name or not result_type or result_data is None:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    folder_path = os.path.join(OUTPUT_DIR, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    result_file = os.path.join(folder_path, 'result.json')

    # 读取现有数据
    if os.path.exists(result_file):
        with open(result_file, 'r', encoding='utf-8') as f:
            try:
                results = json.load(f)
            except:
                results = {}
    else:
        results = {}

    timestamp = datetime.now().isoformat()

    # 如果 result_data 是 list，放到 dict 里
    if isinstance(result_data, list):
        results[result_type] = {
            "items": result_data,
            "timestamp": timestamp
        }
    else:
        # dict 类型就直接添加 timestamp
        result_data['timestamp'] = timestamp
        results[result_type] = result_data

    # 保存最新记录
    results['timestamp'] = timestamp

    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})

# 列出所有文件夹
@app.route('/list_folders', methods=['GET'])
def list_folders():
    if not os.path.exists(OUTPUT_DIR):
        return jsonify([])
    folders = [f for f in os.listdir(OUTPUT_DIR) if os.path.isdir(os.path.join(OUTPUT_DIR, f))]
    return jsonify(folders)

# 加载历史记录
@app.route('/load_result/<folder_name>', methods=['GET'])
def load_result(folder_name):
    folder_path = os.path.join(OUTPUT_DIR, folder_name)
    result_file = os.path.join(folder_path, 'result.json')

    # 查找图片路径
    image_path = None
    for ext in ['.jpg', '.jpeg', '.png', '.dcm']:
        find_path = f"/static/outputs/{folder_name}/{folder_name}{ext}"
        full_path = os.path.join(OUTPUT_DIR, folder_name, f"{folder_name}{ext}")
        if os.path.exists(full_path):
            image_path = find_path
            break

    if not os.path.exists(result_file):
        results = {}
    else:
        with open(result_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
            # print(f"获取{result_file}数据：", results)

    response = {
        "image_path": image_path,
        "classification": results.get('classification', []),
        "grounding": results.get('grounding', {}),
        "report": results.get('report', {}),
        "vqa": results.get('vqa', [])
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=4090, debug=True) # 打开调试模式