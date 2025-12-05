

# cxr-analyzer

A Flask-based platform for multi-functional chest X-ray analysis, integrating image classification, report generation, and VQA.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features
- Multi-class chest X-ray classification (14 categories)
- Automated grounded report generation
- Phrase-level localization for abnormalities
- Visual Question Answering (VQA) support
- Local history and report saving
- Modular interface for small- and large-scale users

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/username/CXR-Analyzer.git
   cd CXR-Analyzer
2. Create and activate a virtual environment:

   ```bash
   conda env create -f environment.yml
   conda activate cxr_env
   ```
3. Run the Flask app:

   ```bash
   python app.py
   ```
5. Open the app in your browser:

   ```
   http://localhost:4090
   ```

## Usage

1. **Initial Page**

   ![Initial page of CXR Analyzer](figure/image-20251125200451487.png)

   - **Research Records (Left):** Search and click to view past analysis, including reports, classification, and VQA answers. All records are stored locally in JSON.  
   - **Image Upload (Middle):** Drag-and-drop or select files for analysis.  
   - **Q&A (Right):** Chat interface with quick question buttons for easy interaction.

2. **Historical Analysis**

   ![Page after selecting a historical analysis](figure/image-20251125200802927.png)

   - Clear image area with the trash button to start a new analysis.  
   - Save results to access later.  
   - Report tab shows structured X-ray findings; Observation tab shows detected features.

3. **Report and Observations**

   ![Generated Chest X-Ray Report](figure/image-20251125202917712.png)  
   ![CheXpert Observations interface](figure/image-20251125202945985.png)

   - Backend loads the model and generates reports automatically.  
   - Observation panel shows 14 categories with confidence bars for quick assessment.

4. **Visual Question Answering (VQA)**

   ![VQA input interface and response](figure/image-20251125205033547.png)  
   ![Follow-up question response](figure/image-20251125210230253.png)

   - Click common questions to auto-fill chat.  
   - Ask follow-up questions based on historical analysis.  
   - Model returns answers within ~2 minutes.

5. **Grounding Functionality**

   ![Activating grounding function](figure/image-20251125210754853.png)  
   ![Grounding results with detected regions](figure/image-20251125211048352.png)

   - Toggle grounding to highlight anatomical regions and key findings with bounding boxes.  
   - Supports visual confirmation of abnormalities.
