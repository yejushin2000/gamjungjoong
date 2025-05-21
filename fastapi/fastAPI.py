from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import List, Optional, Dict, Any
import os
import uvicorn
import uuid
import numpy as np
import cv2
import onnxruntime as ort
from pydantic import BaseModel

# 추가: 환경변수 및 판매글 생성 관련 라이브러리
import requests
import json
import pandas as pd
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()
fastapi_url = os.getenv("REACT_APP_FASTAPI_URL")

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

# 객체탐지 모델 데이터 후처리 및 관리용 함수들
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# IoU 계산 함수 추가 - 얼마나 겹치니?
def calculate_iou(box1, box2):
    """두 박스의 IoU(Intersection over Union) 계산"""
    # box = [x_min, y_min, x_max, y_max]
    x1_min, y1_min, x1_max, y1_max = box1
    x2_min, y2_min, x2_max, y2_max = box2
    
    # 교집합 영역 계산
    x_intersection = max(0, min(x1_max, x2_max) - max(x1_min, x2_min))
    y_intersection = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))
    intersection_area = x_intersection * y_intersection
    
    # 합집합 영역 계산
    box1_area = (x1_max - x1_min) * (y1_max - y1_min)
    box2_area = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = box1_area + box2_area - intersection_area
    
    # IoU 계산
    if union_area == 0:
        return 0
    return intersection_area / union_area

# 멀티파트 형식으로 응답을 보내는 함수
def create_multipart_response(json_data, image_data_list):
    boundary = "boundary"
    async def generate():
        # JSON 데이터 부분 (기존과 동일)
        yield (f"--{boundary}\r\n"
               f"Content-Disposition: form-data; name=\"json_data\"\r\n"
               f"Content-Type: application/json\r\n\r\n"
               f"{json.dumps(json_data)}\r\n")

        # 이미지 데이터 부분 (경로 대신 메모리 데이터 사용)
        for img_name, img_bytes in image_data_list:
            mime_type = "image/jpeg"  # 또는 실제 MIME 타입에 따라 설정
            yield (f"--{boundary}\r\n"
                   f"Content-Disposition: form-data; name=\"{img_name}\"; filename=\"{img_name.split('_')[-1]}.jpg\"\r\n"
                   f"Content-Type: {mime_type}\r\n\r\n")
            yield img_bytes
            yield b'\r\n'

        yield f"--{boundary}--\r\n"

    return StreamingResponse(
        generate(),
        media_type=f"multipart/form-data; boundary={boundary}"
    )

# 모델 관리 클래스 정의
class ModelManager:
    def __init__(self):
        self.classification_session = None
        self.detection_session = None
        self.img_size = 640
        self.init_models()
        
        # 분류 및 탐지 클래스 이름 목록
        self.classification_classes = ["back", "front", "keyboard", "screen", "side"]
        self.detection_classes = ['Damaged Keys', 'Damaged Screen', 'Display Issues', 'Scratch', 'normal']
    
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
        #image = np.transpose(image, (2, 0, 1))  # HWC -> CHW
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
    
    def merge_boxes(self, boxes, iou_threshold=0.8):
        """동일한 클래스의 겹치는 박스들을 하나로 병합"""
        if not boxes:
            return []
            
        # 클래스별로 박스를 그룹화
        class_boxes = {}
        for box in boxes:
            class_name = box["class"]
            if class_name not in class_boxes:
                class_boxes[class_name] = []
            class_boxes[class_name].append(box)
        
        merged_boxes = []
        
        # 각 클래스에 대해 박스 병합 수행
        for class_name, class_specific_boxes in class_boxes.items():
            # 신뢰도에 따라 내림차순 정렬
            sorted_boxes = sorted(class_specific_boxes, key=lambda x: x["confidence"], reverse=True)
            
            while sorted_boxes:
                best_box = sorted_boxes[0]
                sorted_boxes.pop(0)
                
                i = 0
                while i < len(sorted_boxes):
                    current_box = sorted_boxes[i]
                    iou = calculate_iou(best_box["bbox"], current_box["bbox"])
                    
                    if iou > iou_threshold:
                        # 두 박스를 포함하는 최소 사각형 계산
                        x1 = min(best_box["bbox"][0], current_box["bbox"][0])
                        y1 = min(best_box["bbox"][1], current_box["bbox"][1])
                        x2 = max(best_box["bbox"][2], current_box["bbox"][2])
                        y2 = max(best_box["bbox"][3], current_box["bbox"][3])
                        
                        best_box["bbox"] = [x1, y1, x2, y2]
                        # 신뢰도는 더 높은 쪽으로 유지
                        sorted_boxes.pop(i)
                    else:
                        i += 1
                
                merged_boxes.append(best_box)
        
        return merged_boxes
    
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
                
                # normal인 경우, 화면에 표시할 필요가 없기 때문에 입력하지 않기
                if (self.detection_classes[class_id] == "normal"):
                    continue

                boxes.append({
                    "class": self.detection_classes[class_id],
                    "confidence": float(confidence),
                    "bbox": [x_min, y_min, x_max, y_max]
                })
            
            # 겹치는 박스 병합 (IoU 80% 이상)
            merged_boxes = self.merge_boxes(boxes, iou_threshold=0.8)
            
            return merged_boxes

        except Exception as e:
            print(f"Detection error: {e}")
            return []

# 모델 매니저 인스턴스 생성
model_manager = ModelManager()

# 새로운 요청 바디 모델 정의
class GenerateDescriptionRequest(BaseModel):
    classification_results: Optional[List[Dict[str, Any]]] = []
    detection_results: Optional[List[Dict[str, Any]]] = []
    image_filenames: Optional[List[str]] = []
    product_name: str
    price: str
    purchase_date: Optional[str] = ""
    serial_number: Optional[str] = ""
    configuration: Optional[int] = 1

# 손상 상태를 프롬프트 형식으로 변환하는 함수
def format_scratch_data(detection_image_urls):
    """
    탐지 결과를 프롬프트용 scratch_data 형식으로 변환
    """
    damages = []  # 모든 손상을 하나의 리스트로 관리
    screen_condition = "완벽함"
    keyboard_condition = "완벽함"
    overall_condition = "매우 우수함"
    
    normal_parts = set()  # 정상으로 판단된 부위를 추적
    
    # 탐지된 객체를 분류하여 적절한 카테고리에 추가
    for detection_result in detection_image_urls:
        for detection in detection_result.get("detections", []):
            class_name = detection.get("class", "")
            confidence = detection.get("confidence", 0)
            
            # 이미지 클래스 찾기 (원본 이미지 URL에 해당하는 분류 결과)
            original_url = detection_result.get("original_url", "")
            
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
            
            # normal 클래스는 정상 부품으로 처리
            if class_name == "normal":
                normal_parts.add(location)
                continue
            
            # 손상 정도와 설명 (클래스에 따라 다르게 처리)
            description = ""
            severity = ""
            
            if class_name == "Scratch":
                severity = "경미함"
                description = f"{location}에 스크래치가 있습니다. 사용에는 영향이 없습니다."
            elif class_name == "Damaged Keys":
                severity = "사용에 영향 있음"
                keyboard_condition = "일부 손상있음"
                description = f"{location}에 키 손상이 있습니다. 일부 키가 제대로 작동하지 않을 수 있습니다."
            elif class_name == "Damaged Screen":
                severity = "사용에 영향 있음"
                screen_condition = "손상있음"
                description = f"{location}에 화면 손상이 있습니다. 디스플레이 일부가 제대로 표시되지 않을 수 있습니다."
            elif class_name == "Display Issues":
                severity = "사용에 영향 있음"
                screen_condition = "손상있음"
                description = f"{location}에 디스플레이 문제가 있습니다. 색상 표현이나 밝기에 영향을 줄 수 있습니다."
            else:  # 기타 손상
                severity = "확인 필요"
                description = f"{location}에 손상이 감지되었습니다. 자세한 확인이 필요합니다."
            
            # 손상 정보 추가
            damages.append({
                "type": class_name,
                "location": location,
                "description": description,
                "severity": severity
            })
    
    # 정상 부품 정보 추가
    normal_desc = {
        "상판": "상판은 정상 상태입니다. 특별한 손상이 없습니다.",
        "하판": "하판은 정상 상태입니다. 특별한 손상이 없습니다.",
        "측면": "측면은 정상 상태입니다. 특별한 손상이 없습니다.",
        "키보드": "키보드는 완벽한 상태입니다. 모든 키가 정상 작동합니다.",
        "화면": "화면은 완벽한 상태입니다. 디스플레이에 문제가 없습니다."
    }
    
    # 정상으로 확인된 부품에 대한 정보 추가
    for part in normal_parts:
        if part in normal_desc:
            damages.append({
                "type": "normal",
                "location": part,
                "description": normal_desc[part],
                "severity": "정상"
            })
            
    # 전체 상태 설명 (탐지된 문제 수와 종류에 따라)
    severe_issues = sum(1 for damage in damages if "영향 있음" in damage["severity"])
    minor_issues = sum(1 for damage in damages if damage["severity"] == "경미함")
    
    if len(damages) == 0 or all(damage["type"] == "normal" for damage in damages):
        overall_condition = "완벽한 상태"
    elif severe_issues == 0 and minor_issues <= 2:
        overall_condition = "매우 우수함"
    elif severe_issues == 0 and minor_issues > 2:
        overall_condition = "우수함"
    elif severe_issues == 1:
        overall_condition = "양호함"
    elif severe_issues <= 3:
        overall_condition = "사용감 있음"
    else:
        overall_condition = "상당한 사용감 있음"
    
    return {
        "damages": damages,
        "screen_condition": screen_condition,
        "keyboard_condition": keyboard_condition,
        "overall_condition": overall_condition,
        "normal_parts": list(normal_parts)  # 정상 부품 목록도 함께 반환
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
    has_valid_specs = "정보없음" not in specs_text and "알 수 없음" not in specs_text

    # 스펙 정보 포함 여부에 따른 조건부 텍스트
    specs_header = "<노트북 상세 정보>\n" + specs_text if has_valid_specs else ""
    specs_section_guide = "(아래 정보를 포함하여 작성)" if has_valid_specs else "(정확한 스펙 정보가 없으므로 이 섹션은 생략)"
    specs_content = specs_text if has_valid_specs else ""
    specs_principle = "스펙 정보는 specs_text에서 제공된 모든 항목을 누락 없이 포함할 것" if has_valid_specs else "스펙 정보는 검색된 정보가 있을 경우에만 포함"
    final_instruction = "제공된 스펙 정보를 빠짐없이 활용하고, 이미지 분석 결과를 자연스럽게 통합하여 구매자가 제품 상태와 특징을 정확히 파악할 수 있는 판매글을 작성해줘." if has_valid_specs else "이미지 분석 결과를 자연스럽게 통합하여 구매자가 제품 상태와 특징을 정확히 파악할 수 있는 판매글을 작성해줘."

    # 프롬프트 작성
    prompt = f"""
    노트북 정보와 이미지 분석 결과를 바탕으로 구매자에게 신뢰감을 주는 중고 거래 판매글을 작성해줘.
    <구매 및 판매 정보>
    - 구매일자: {purchase_date}
    - 판매희망가격: {price}
    - 상품 구성: {"풀박스 (박스 및 모든 구성품 포함)" if configuration == 0 else "일부 구성품 포함" if configuration == 1 else "단품 (본체만)"}
    <상태 정보 (AI 자동 분석 결과)>
    {json.dumps(scratch_data, ensure_ascii=False, indent=2)}
    {specs_header}
    판매글 작성 가이드:
    1. 제목: 
    - 형식: "[브랜드명 모델명] 핵심 스펙 + 상태 + 구성" (60자 이내)
    - 예시: "[삼성 갤럭시북5 Pro] i7/16GB/512GB 상태A급 풀박스"
    - '제목:' 표시로 시작
    2. 설명: (아래 섹션을 명확히 구분하여 작성)
    - 제품 요약: 한눈에 볼 수 있는 핵심 정보 요약 (2-3줄)
    
    - 스펙 정보: {specs_section_guide}
        {specs_content}
    
    - 상태 정보:
        • AI 분석된 손상 정보를 자연스러운 문장으로 설명
        • 위치별 상태 (상판, 하판, 측면, 후면, 키보드, 화면 등)
        • 전체적인 외관 상태를 서술적으로 설명 (점수 없이)
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
        • 가격은 만원 붙이지 말고 그냥 원 단위로 기재
    3. 작성 원칙:
    - {specs_principle}
    - AI 분석된 상태 정보를 실제 상태로 자연스럽게 표현
    - 장단점을 모두 정직하게 언급하여 신뢰감 형성
    - 전문 용어는 일반 소비자가 이해하기 쉽게 설명
    - 구매자 입장에서 궁금할 만한 정보 포함 (발열, 소음, 실사용 배터리 등)
    - 절대로 상태 점수를 숫자로 표현하지 말 것 (예: "7/10" 같은 표현 사용 금지)
    - Markdown 형식 사용하지 말 것 (*, #, -, ** 등의 마크다운 기호를 사용하지 말 것)
    - 일반 텍스트로만 출력할 것 (섹션 구분은 줄바꿈으로만 하고, 강조는 마크다운 대신 문장으로 표현)
    4. 형식:
    - 각 섹션은 "제품 요약:", "스펙 정보:", "상태 정보:", "사용 정보:", "구성품 정보:", "판매 정보:" 형식으로 시작
    - 각 섹션 사이에는 빈 줄 하나만 사용
    - 불릿 포인트는 '•' 또는 '-' 대신 간단히 줄바꿈으로 구분
    - 강조가 필요한 경우 ** 또는 * 대신 자연스러운 문장으로 표현 (예: "특히 중요한 점은...")
    5. 말투/톤:
    - 중고거래 플랫폼에 맞는 친근하고 자연스러운 말투
    - 전문성과 신뢰감을 주는 어조 유지
    - 핵심 정보와 장점은 강조하여 표시
    {final_instruction}
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

@app.post("/upload-info")
async def upload_info_multipart(
    images: List[UploadFile] = File(...),
    product_name: str = Form(...),
    price: str = Form(...),
    description: str = Form(...),
):
    print("upload-info 호출됨")
    try:
        classification_results = []
        detection_results_all = [] # 모든 이미지의 탐지 결과를 담을 리스트
        print("이미지 정보들 : ", images)
        print("상품명 : ", product_name)
        for image in images:
            original_filename = image.filename
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            content = await image.read()
            img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
            if img is not None:
                classification_result = model_manager.classify_image(img)
                classification_results.append({
                    "original_filename": original_filename, # 원본 파일 이름 추가
                    "filename": unique_filename,
                    "classification": classification_result
                })

                detections = model_manager.detect_objects(img)
                detection_results_all.append({
                    "original_filename": original_filename, # 원본 파일 이름 추가
                    "filename": unique_filename,
                    "detections": detections
                })

        json_data = {
            "product_name": product_name,
            "price": price,
            "classification_results": classification_results,
            "detection_results": detection_results_all,
        }

        return JSONResponse(content=json_data)

    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 판매글 생성 엔드포인트
@app.post("/generate-description")
async def generate_description(request_data: GenerateDescriptionRequest):
    try:
        product_name = request_data.product_name
        price = request_data.price
        purchase_date = request_data.purchase_date
        serial_number = request_data.serial_number
        configuration = request_data.configuration
        classification_results = request_data.classification_results or []
        detection_results_all = request_data.detection_results or []
        image_filenames = request_data.image_filenames or []

        print("✅ /generate-description 호출됨")
        print("➡️ 받은 classification 결과:", classification_results)
        print("➡️ 받은 detection 결과:", detection_results_all)
        print("➡️ 받은 이미지 파일명:", image_filenames)

        # detection_results_all을 detection_image_urls 형식으로 변환
        detection_image_urls = []
        for i, detection_result in enumerate(detection_results_all):
            original_filename = detection_result.get("original_filename") or (image_filenames[i] if i < len(image_filenames) else "unknown")
            detection_image_urls.append({
                "original_url": original_filename, # URL 대신 파일명 사용
                "detection_url": None, # 더 이상 detection 이미지를 생성하지 않음
                "detections": detection_result.get("detections", [])
            })

        # 스펙 정보 구성 (기존 로직 활용)
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

        # 시리얼 넘버로 정보 검색 시도 (기존 로직 활용)
        try:
            try:
                df = pd.read_csv('Laptop.csv', encoding='utf-8')
            except:
                df = pd.read_csv('Laptop.csv', encoding='cp949')

            laptop = None
            if '시리얼넘버' in df.columns:
                matches = df[df['시리얼넘버'] == serial_number]
                if not matches.empty:
                    laptop = matches.iloc[0]

            if laptop is not None:
                specs_text = f"""
                • 브랜드: {laptop.get('브랜드', '정보없음')}
                • 모델: {laptop.get('제품군', product_name)}
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

        # 흠집 데이터 형식 변환 (기존 로직 활용)
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
            "image_urls": image_filenames, # 프론트엔드에서 받은 파일명 그대로 반환
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