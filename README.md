

[TOC]

# cxr-analyzer

AI-powered chest X-ray analysis platform

## 环境

```bash
# 创建环境
conda create -n cxr_env python=3.9 -y
# 激活环境
conda activate cxr_env
# 安装 Flask
pip install flask
```

```bash
# 进入项目
cd "/mnt/e/STAT7008A Programming for data science/4. Project/Topic 6 Agentic Al for Chest X-ray Analysis/CXR Analyzer"
code .
```

1. 导出项目配置
   + 先激活虚拟环境 `conda activate cxr_env `
   + 然后导出 `conda env export --no-builds --ignore-channels > environment.yml`

## git提交

```bash
# 初始化
git init
git remote add origin https://github.com/SearchingHoulton/cxr-analyzer.git
git add .
git commit -m "initial commit"
git branch -M main
git push -u origin main
```

```bash
# 1. 拉取远端最新 main
git checkout main
git pull origin main

# 2. 创建 dev 分支
git checkout -b dev
git push -u origin dev

# 3. 创建四个 feature 分支

# 4. 创建 fix 分支
git checkout dev
git checkout -b fix/general
git push -u origin fix/general
```

```bash
# 确认分支
git branch
# 先切换分支再添加新文件
git switch feature/vqa
# 添加当前目录所有文件
git add .
# 说明添加的东西
git commit -m "feat: xxx"
# 推送到远端。如果第一次推送该分支加 -u 绑定远端，git push -u origin feature/vqa
git push origin feature/vqa
```

## 开发说明

1. 环境导入和激活

   conda env create -f environment.yml
   conda activate cxr_env

   开发过程中自行安装依赖

   pip install torch torchvision

   ...

   最后统一导出依赖

   + pip安装的包：pip list --format=freeze > requirements.txt
   + conda安装的包：conda env export --no-builds --ignore-channels > environment.yml

   > 我导出的环境只有基础的flask需要的配置，其他支持功能模型运行的需要自行在该虚拟环境中下载然后导出。

2. 两种方式：① 自己写接口上传；② 就放文件，我来添加

   + 自己写接口

     > 前后端交互我后期加上

     把代码上传到services里面，新建一个文件夹，可以用**模型名字**命名。

     上传代码，可以注释掉其他flask代码，然后写一个新的带有区分度的接口，再用request查看结果

     举例子，我用chatgpt生成的

     ```python
     from flask import Flask, request, jsonify
     
     app = Flask(__name__)
     
     @app.route("/predict", methods=["POST"])
     def predict():
         data = request.json  # 接收传来的数据
         result = {"output": data}  # 这里改成实际处理逻辑
         return jsonify(result)
     
     if __name__ == "__main__":
         app.run(debug=True)
     
     ```

     然后测试

     ```python
     import requests
     
     data = {"x": 1}
     res = requests.post("http://127.0.0.1:4090/predict", json=data)
     print(res.json())
     ```

   + 就放一个文件

     service创建一个文件夹，名字用模型、名字啥的命名，能让别人看得懂就行，然后把自己的代码和一些内容放上去。

3. git提交

   首先查看当前在的分支，那个打星号的说明是当前在的branch

   ```bash
   $ git branch
     dev
     feature/jiangyaru
     feature/juhaoyang
     feature/maxiaohan
     feature/xiongrui
   * fix/general
     main
   ```

   上传的时候**<u>选择</u>**对应的名字进入分支

   ```bash
   git checkout feature/juhaoyang
   git checkout feature/xiongrui
   ```

   然后上传

   + 如果是第一次上传

     ```bash
     git add .
     git commit -m "首次提交 <简短说明>"
     git push -u origin feature/juhaoyang  # -u 会关联远程分支
     ```

   + 不是第一次上传

     git add . 会把当前目录及子目录下所有**未跟踪文件**和**已修改文件**全部加入暂存区。

     ```bash
     git add .
     git commit -m "<简短说明>"
     git push
     ```

     如果只有一些指定文件更新

     ```bash		
     git add environment.yml requirements.txt
     git commit -m "<简短说明>"
     git push
     ```

## 注意

1. 如果前一天还打得开，今天不行，`wsl --shutdown`后重新开。
