1. 如果前一天还打得开，今天不行，`wsl --shutdown`后重新开。

## 配置环境

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

## git提交

```bash
git init
git remote add origin https://github.com/SearchingHoulton/cxr-analyzer.git
git add .
git commit -m "initial commit"
git branch -M main
git push -u origin main
```

