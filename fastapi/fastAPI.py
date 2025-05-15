from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import shutil
import uvicorn
import uuid
import numpy as np
import cv2
import onnxruntime as ort
from pydantic import BaseModel
import base64
from PIL import Image, ImageDraw
import io

# 추가: 환경변수 및 판매글 생성 관련 라이브러리
import requests
import json
import pandas as pd
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# API 설정
GMS_API_KEY = os.getenv("GMS_API_KEY")
GMS_ENDPOINT = "https://gms.p.ssafy.io/gmsapi/api.openai.com/v1/chat/completions"
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {GMS_API_KEY}"}

# FastAPI 인스턴스 생성
app = FastAPI(title="Product Image Processing API")

# CORS 설정 (모든 origin 허용 – 배포 시에는 필요한 origin만 허용해야 함)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시에는 frontend 주소만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 업로드 및 결과 이미지 저장 경로 생성
UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# 모델 경로 설정
classification_model_path = "models/classifier.onnx"
detection_model_path = "models/detector.onnx"

# 모델 존재 여부 확인
if not os.path.exists(classification_model_path):
    print(f"Warning: Classification model not found at {classification_model_path}")
if not os.path.exists(detection_model_path):
    print(f"Warning: Detection model not found at {detection_model_path}")

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# 모델 관리 클래스 정의
class ModelManager:
    def __init__(self):
        self.classification_session = None
        self.detection_session = None
        self.img_size = 640
        self.init_models()
        
        # 분류 및 탐지 클래스 이름 목록
        self.classification_classes = ["back", "front", "keyboard", "screen", "side"]
        self.detection_classes = ["Crack", "Damaged Keys", "Damaged Screen", "Display Issues", "Scratch"]
    
    def init_models(self):
        # ONNX 모델 로드
        try:
            if os.path.exists(classification_model_path):
                self.classification_session = ort.InferenceSession(classification_model_path)
        except Exception as e:
            print(f"Failed to load classification model: {e}")
        
        try:
            if os.path.exists(detection_model_path):
                self.detection_session = ort.InferenceSession(detection_model_path)
        except Exception as e:
            print(f"Failed to load detection model: {e}")
    
    def preprocess_image(self, image, size=(640, 640)):
        """이미지를 모델 입력 크기에 맞게 전처리"""
        image = cv2.resize(image, size)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = image.astype(np.float32) / 255.0
        image = np.transpose(image, (2, 0, 1))  # HWC -> CHW
        image = np.expand_dims(image, axis=0)  # 배치 차원 추가
        return image
    
    def classify_image(self, image_array):
        """분류 모델을 사용해 이미지 분류"""
        if self.classification_session is None:
            return {"class": "unknown", "confidence": 0.0}
        
        try:
            input_image = self.preprocess_image(image_array)
            input_name = self.classification_session.get_inputs()[0].name
            output_name = self.classification_session.get_outputs()[0].name
            outputs = self.classification_session.run([output_name], {input_name: input_image})
            probabilities = outputs[0][0]
            class_idx = np.argmax(probabilities)
            confidence = float(probabilities[class_idx])
            
            return {
                "class": self.classification_classes[class_idx],
                "confidence": confidence
            }
        except Exception as e:
            print(f"Classification error: {e}")
            return {"class": "error", "confidence": 0.0}
    
    
    
    def detect_objects(self, image_array, conf_threshold=0.3, iou_threshold=0.45):
        """탐지 모델을 사용해 이미지에서 객체 탐지"""
        if self.detection_session is None:
            return []

        try:
            input_image = self.preprocess_image(image_array)  # (1, 3, IMG_SIZE, IMG_SIZE)
            original_height, original_width = image_array.shape[:2]
            input_name = self.detection_session.get_inputs()[0].name
            outputs = self.detection_session.run(None, {input_name: input_image})

            detections_raw = outputs[0]  # 예: (1, 8400, 10) or (1, 10, 8400)
            
            # 출력 shape 정리
            if detections_raw.ndim == 3:
                if detections_raw.shape[1] == len(self.detection_classes) + 5:
                    detections = detections_raw[0].T  # (8400, 10)
                else:
                    detections = detections_raw[0]  # (8400, 10)
            else:
                raise ValueError(f"Unexpected output shape: {detections_raw.shape}")

            boxes = []

            for detection in detections:
                if len(detection) < 6:
                    continue

                # box 정보
                cx, cy, w, h = detection[:4]

                # objectness score (sigmoid 적용)
                obj_score = sigmoid(detection[4])

                # class scores (sigmoid 후 가장 높은 것 선택)
                class_logits = detection[5:]
                class_probs = sigmoid(class_logits)
                class_id = int(np.argmax(class_probs))
                class_score = class_probs[class_id]

                # 최종 confidence = objectness * class score
                confidence = obj_score * class_score

                if confidence < conf_threshold or class_id >= len(self.detection_classes):
                    continue

                # 원본 크기에 맞게 좌표 변환
                x_min = int((cx - w / 2) / self.img_size * original_width)
                y_min = int((cy - h / 2) / self.img_size * original_height)
                x_max = int((cx + w / 2) / self.img_size * original_width)
                y_max = int((cy + h / 2) / self.img_size * original_height)
                print("인식좌표: ", x_min, y_min, x_max, y_max)
                boxes.append({
                    "class": self.detection_classes[class_id],
                    "confidence": float(confidence),
                    "bbox": [x_min, y_min, x_max, y_max]
                })
                print(boxes)
            return boxes

        except Exception as e:
            print(f"Detection error: {e}")
            return []
    
    def draw_detections(self, image, detections):
        """탐지된 객체에 대한 바운딩 박스를 이미지에 그리기"""
        image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(image_pil)
        
        for detection in detections:
            bbox = detection["bbox"]
            label = f"{detection['class']} {detection['confidence']:.2f}"
            draw.rectangle(bbox, outline="red", width=2)
            draw.text((bbox[0], bbox[1] - 10), label, fill="red")
        
        return cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)

# 모델 매니저 인스턴스 생성
model_manager = ModelManager()

# 손상 상태를 프롬프트 형식으로 변환하는 함수
def format_scratch_data(detection_image_urls):
    """
    탐지 결과를 프롬프트용 scratch_data 형식으로 변환
    """
    scratches = []
    dents = []
    screen_condition = "완벽함"
    keyboard_condition = "완벽함"
    overall_condition = "매우 우수함 (9.5/10)"
    
    # 탐지된 객체를 분류하여 적절한 카테고리에 추가
    for detection_result in detection_image_urls:
        for detection in detection_result.get("detections", []):
            class_name = detection.get("class", "")
            confidence = detection.get("confidence", 0)
            
            # 이미지 클래스 찾기 (원본 이미지 URL에 해당하는 분류 결과)
            original_url = detection_result.get("original_url", "")
            image_class = "unknown"
            
            # 여기서는 classification_results가 글로벌 변수가 아니므로 찾을 수 없습니다.
            # 실제 구현에서는 적절한 방법으로 이미지 클래스를 찾아야 합니다.
            # 간단한 매핑으로 대체합니다.
            
            # 위치 매핑 (간단한 구현)
            if "front" in original_url:
                location = "상판"
            elif "back" in original_url:
                location = "하판"
            elif "side" in original_url:
                location = "측면"
            elif "keyboard" in original_url:
                location = "키보드"
            elif "screen" in original_url:
                location = "화면"
            else:
                # URL에서 클래스를 찾을 수 없으면 임의로 설정
                location = class_name.lower()
            
            # 상태의 심각도 결정 (confidence score를 기반으로)
            if confidence > 0.8:
                severity = "심각함"
            elif confidence > 0.6:
                severity = "보통"
            elif confidence > 0.4:
                severity = "경미함"
            else:
                severity = "매우 경미함"
            
            # 클래스에 따라 적절한 카테고리에 추가
            if class_name == "Scratch":
                scratches.append({
                    "location": f"{location}",
                    "size": "약 1-2cm",
                    "severity": severity
                })
            elif class_name in ["Crack", "Display Issues"]:
                dents.append({
                    "location": f"{location}",
                    "size": "약 1-2cm",
                    "severity": severity
                })
            
            # 화면 상태 업데이트
            if "screen" in location.lower() and class_name in ["Damaged Screen", "Display Issues"]:
                screen_condition = "손상있음"
            
            # 키보드 상태 업데이트
            if "keyboard" in location.lower() and class_name == "Damaged Keys":
                keyboard_condition = "일부 손상있음"
    
    # 전체 상태 점수 계산 (탐지된 문제 수에 따라)
    total_issues = len(scratches) + len(dents)
    if total_issues == 0:
        overall_condition = "완벽한 상태 (10/10)"
    elif total_issues <= 1:
        overall_condition = "매우 우수함 (9/10)"
    elif total_issues <= 3:
        overall_condition = "우수함 (8/10)"
    elif total_issues <= 5:
        overall_condition = "양호함 (7/10)"
    else:
        overall_condition = "사용감 있음 (6/10)"
    
    return {
        "scratches": scratches,
        "dents": dents,
        "screen_condition": screen_condition,
        "keyboard_condition": keyboard_condition,
        "overall_condition": overall_condition
    }

# 추가: ChatGPT를 사용하여 판매글 생성 함수
async def generate_sales_content(
    product_name, 
    purchase_date, 
    serial_number, 
    price, 
    description, 
    configuration, 
    specs_text, 
    scratch_data
):
    """
    ChatGPT를 사용하여 중고 노트북 판매글 생성
    """
    # 프롬프트 작성
    prompt = f"""
    노트북 정보와 이미지 분석 결과를 바탕으로 구매자에게 신뢰감을 주는 중고 거래 판매글을 작성해줘.
    <노트북 상세 정보>
    {specs_text}
    <구매 및 판매 정보>
    - 구매일자: {purchase_date}
    - 판매희망가격: {price}
    - 상품 구성: {"풀박스 (박스 및 모든 구성품 포함)" if configuration == 0 else "일부 구성품 포함" if configuration == 1 else "단품 (본체만)"}
    <상태 정보 (AI 자동 분석 결과)>
    {json.dumps(scratch_data, ensure_ascii=False, indent=2)}
    판매글 작성 가이드:
    1. 제목: 
       - 형식: "[브랜드명 모델명] 핵심 스펙 + 상태 + 구성" (60자 이내)
       - 예시: "[삼성 갤럭시북5 Pro] i7/16GB/512GB 상태A급 풀박스"
       - '제목:' 표시로 시작
    2. 설명: (아래 섹션을 명확히 구분하여 작성)
       - 제품 요약: 한눈에 볼 수 있는 핵심 정보 요약 (2-3줄)
       
       - 스펙 정보: (노트북 상세 정보에서 제공된 모든 정보를 반드시 포함)
         • 브랜드 및 모델명
         • CPU 정보 (브랜드, 모델)
         • 메모리(RAM) 용량
         • 저장 공간 정보
         • 화면 크기 및 해상도
         • 그래픽 카드 정보
         • 배터리 용량/지속시간
         • 무게
         • OS 정보
         • 기타 특징적인 스펙 (있을 경우)
       
       - 상태 정보:
         • AI 분석된 흠집/덴트 정보를 자연스러운 문장으로 설명
         • 위치별 상태 (상판, 하판, 측면, 후면, 키보드, 화면 등)
         • 전체적인 외관 상태 점수 (10점 만점)
         • 실제 사용에 미치는 영향 (있다면)
       
       - 사용 정보:
         • 구매 시기와 실제 사용 기간
         • 주 사용 용도와 사용 빈도
         • 판매자 설명 (있을 경우 반드시 포함)
       
       - 구성품 정보:
         • 포함된 구성품 목록 상세히 기재
         • 원래 구성품 중 누락된 것이 있다면 명시
       
       - 판매 정보:
         • 판매 희망가격과 네고 가능 여부
         • 선호하는 거래 방식 언급
    3. 작성 원칙:
       - 스펙 정보는 specs_text에서 제공된 모든 항목을 누락 없이 포함할 것
       - AI 분석된 상태 정보를 실제 상태로 자연스럽게 표현
       - 장단점을 모두 정직하게 언급하여 신뢰감 형성
       - 전문 용어는 일반 소비자가 이해하기 쉽게 설명
       - 구매자 입장에서 궁금할 만한 정보 포함 (발열, 소음, 실사용 배터리 등)
    4. 말투/톤:
       - 중고거래 플랫폼에 맞는 친근하고 자연스러운 말투
       - 전문성과 신뢰감을 주는 어조 유지
       - 핵심 정보와 장점은 강조하여 표시
    제공된 스펙 정보를 빠짐없이 활용하고, 이미지 분석 결과를 자연스럽게 통합하여 구매자가 제품 상태와 특징을 정확히 파악할 수 있는 판매글을 작성해줘.
    """
    
    # ChatGPT API 요청 데이터
    data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "당신은 중고 노트북 판매글 작성을 도와주는 전문가입니다. 자연스럽고 정직한 판매글을 작성해주세요."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    try:
        # API 요청
        response = requests.post(GMS_ENDPOINT, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        generated_text = result["choices"][0]["message"]["content"]
        
        # 제목과 설명 추출
        title = ""
        description = ""
        
        if "제목:" in generated_text:
            title_parts = generated_text.split("제목:")
            if len(title_parts) > 1:
                title_line = title_parts[1].strip().split("\n")[0]
                title = title_line
        
        if "설명:" in generated_text:
            desc_parts = generated_text.split("설명:")
            if len(desc_parts) > 1:
                description = desc_parts[1].strip()
        
        # 구분이 안 되는 경우
        if not title or not description:
            lines = generated_text.strip().split('\n')
            if lines:
                title = title or lines[0][:60]
                description = description or "\n".join(lines[1:])
        
        return {
            "title": title,
            "description": description,
            "full_generated_text": generated_text
        }
        
    except Exception as e:
        print(f"판매글 생성 오류: {str(e)}")
        return {
            "title": f"{product_name} 판매합니다",
            "description": f"상품명: {product_name}\n구매일: {purchase_date}\n가격: {price}\n{description}",
            "error": str(e)
        }

# 루트 엔드포인트
@app.get("/")
def read_root():
    return {"message": "Product Image Processing API"}

# 이미지 업로드 및 처리 엔드포인트
@app.post("/upload-info")
async def upload_info(
    images: List[UploadFile] = File(...),
    product_name: str = Form(...),
    price: str = Form(...),
    description: str = Form(...)
):
    try:
        image_urls = []
        classification_results = []
        detection_image_urls = []
        
        for image in images:
            # 고유 파일명 생성
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            filepath = os.path.join(UPLOAD_DIR, unique_filename)
            
            # 파일 저장
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_url = f"/uploads/{unique_filename}"
            image_urls.append(image_url)
            
            img = cv2.imread(filepath)
            if img is None:
                print(f"Failed to load image: {filepath}")
                continue
            
            # 이미지 분류
            classification_result = model_manager.classify_image(img)
            classification_results.append({
                "image_url": image_url,
                "classification": classification_result
            })
            
            # 객체 탐지
            detections = model_manager.detect_objects(img) # ex -> boxes : [{'class': 'Scratch', 'confidence': 0.3044613301753998, 'bbox': [17, 119, 171, 247]}] 이런걸 받음
            if detections:
                detection_img = model_manager.draw_detections(img.copy(), detections)
                detection_filename = f"detection_{unique_filename}"
                detection_filepath = os.path.join(PROCESSED_DIR, detection_filename)
                cv2.imwrite(detection_filepath, detection_img)
                detection_url = f"/processed/{detection_filename}"
                detection_image_urls.append({
                    "original_url": image_url,
                    "detection_url": detection_url,
                    "detections": detections
                })
            else:
                print("멀쩡한 노트북이거나, 노트북이 없거나")
        
        # 텍스트 리포트 생성
        combined_text = "Product Analysis Report:\n\n"
        for result in classification_results:
            combined_text += f"Item detected: {result['classification']['class']} (confidence: {result['classification']['confidence']:.2f})\n"
        
        combined_text += "\nDetection Summary:\n"
        defect_count = 0
        for detection_result in detection_image_urls:
            for detection in detection_result["detections"]:
                if detection["class"] in ["Crack", "Damaged Keys", "Damaged Screen", "Display Issues", "Scratch"]:
                    defect_count += 1
                    combined_text += f"Found {detection['class']} (confidence: {detection['confidence']:.2f})\n"
        
        if defect_count > 0:
            combined_text += f"\nWarning: Detected {defect_count} potential defects that may affect product value."
        else:
            combined_text += "\nProduct appears to be in good condition with no visible defects."
        
        # 중간 로그 추가: 데이터 확인
        print("Product Information:", {
            "product_name": product_name,
            "price": price,
            "description": description
        })
        print("Image URLs:", image_urls)
        print("Classification Results:", classification_results)
        print("Detection Results:", detection_image_urls)
        print("Combined Text:", combined_text)

        # JSON 응답 반환
        return JSONResponse(content={
            "product_name": product_name,
            "price": price,
            "description": description,
            "image_urls": image_urls,
            "combined_text": combined_text,
            "classification_results": classification_results,
            "detection_results": detection_image_urls
        })
    
    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 판매글 생성 엔드포인트
@app.post("/generate-description")
async def generate_description(
    images: List[UploadFile] = File(...),
    product_name: str = Form(...),
    price: str = Form(...),
    purchase_date: str = Form(""),
    serial_number: str = Form(""),
    configuration: int = Form(1)
):
    try:
        image_urls = []
        classification_results = []
        detection_image_urls = []
        
        for image in images:
            # 고유 파일명 생성
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            filepath = os.path.join(UPLOAD_DIR, unique_filename)
            
            # 파일 저장
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_url = f"/uploads/{unique_filename}"
            image_urls.append(image_url)
            
            img = cv2.imread(filepath)
            if img is None:
                print(f"Failed to load image: {filepath}")
                continue
            
            # 이미지 분류
            classification_result = model_manager.classify_image(img)
            classification_results.append({
                "image_url": image_url,
                "classification": classification_result
            })
            
            # 객체 탐지
            detections = model_manager.detect_objects(img)
            if detections:
                detection_img = model_manager.draw_detections(img.copy(), detections)
                detection_filename = f"detection_{unique_filename}"
                detection_filepath = os.path.join(PROCESSED_DIR, detection_filename)
                cv2.imwrite(detection_filepath, detection_img)
                detection_url = f"/processed/{detection_filename}"
                detection_image_urls.append({
                    "original_url": image_url,
                    "detection_url": detection_url,
                    "detections": detections
                })
        
        # 스펙 정보 구성 (간단한 예시)
        specs_text = f"""
        • 브랜드: 알 수 없음
        • 모델: {product_name}
        • 화면: 알 수 없음
        • CPU: 알 수 없음
        • 그래픽: 알 수 없음
        • 메모리: 알 수 없음
        • 저장 공간: 알 수 없음
        • 배터리: 알 수 없음
        • 무게: 알 수 없음
        • OS: 알 수 없음
        """
        
        # 시리얼 넘버로 정보 검색 시도
        try:
            # CSV 파일 로드 시도
            try:
                df = pd.read_csv('Laptop.csv')
            except:
                df = pd.read_csv('Laptop.csv', encoding='cp949')
            
            # 시리얼 넘버로 검색
            laptop = None
            if '시리얼넘버' in df.columns:
                matches = df[df['시리얼넘버'] == serial_number]
                if not matches.empty:
                    laptop = matches.iloc[0]
            
            # 스펙 정보 구성
            if laptop is not None:
                specs_text = f"""
                • 브랜드: {laptop.get('브랜드', '정보없음')}
                • 모델: {laptop.get('제품군', {product_name})}
                • 화면: {laptop.get('화면 크기', '정보없음')} ({laptop.get('해상도', '정보없음')})
                • CPU: {laptop.get('CPU 브랜드', '정보없음')} {laptop.get('CPU 모델', '정보없음')}
                • 그래픽: {laptop.get('GPU 타입', '정보없음')} {laptop.get('GPU 카드', '정보없음')}
                • 메모리: {laptop.get('RAM', '정보없음')}
                • 저장 공간: {laptop.get('저장 용량', '정보없음')}
                • 배터리: {laptop.get('배터리', '정보없음')}
                • 무게: {laptop.get('무게', '정보없음')}
                • OS: {laptop.get('os', '정보없음')}
                """
        except Exception as e:
            print(f"CSV 검색 실패: {e}")
        
        # 흠집 데이터 형식 변환
        scratch_data = format_scratch_data(detection_image_urls)
        
        # 판매글 생성
        sales_content = await generate_sales_content(
            product_name,
            purchase_date,
            serial_number,
            price,
            "",  # 설명은 빈 값으로
            configuration,
            specs_text,
            scratch_data
        )
        
        # 결과 반환
        return JSONResponse(content={
            "product_name": product_name,
            "price": price,
            "image_urls": image_urls,
            "detection_results": detection_image_urls,
            "sales_content": sales_content,
            "title": sales_content["title"],
            "description": sales_content["description"],
            "specs_text": specs_text,
            "scratch_data": scratch_data
        })
    
    except Exception as e:
        print(f"게시글 생성 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# 정적 파일 경로 설정 (업로드 및 결과 이미지 서빙)
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")

# 로컬 서버 실행
if __name__ == "__main__":
    uvicorn.run("fastAPI:app", host="0.0.0.0", port=8000, reload=True)