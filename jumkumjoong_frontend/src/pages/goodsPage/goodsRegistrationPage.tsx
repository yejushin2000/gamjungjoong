// src/pages/goodsPage/goodsRegistrationPage.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavigationBar from "../../components/common/NavigationBar";
import Header from "../../components/common/Header";
import PriceInput from "../../components/goods/PriceInput";
import CameraModal from "../../components/goods/CameraModal";

// Goods 타입 인터페이스 임포트
import { ItemRegistParams } from "../../types/types";
import { postGoods, postGoodsEdit } from "../../api/goods";
import SerialNumberInput from "../../components/goods/SerialNumberInput";

// 이미지 처리를 위한 API 함수 import
import fastapiInstance from "../../api/fastapi"; // 기존 axios 인스턴스 활용

// 구성여부 타입 정의
type PackageType = "full" | "single" | "partial";

interface ExtendedGoodsData extends ItemRegistParams {
  // images: File[];
  purchaseYear: string;
  purchaseMonth: string;
  // purchaseDate: string;
  images: string[]; // base64 형식의 이미지 문자열 배열
  imageUrls?: string[]; // 서버에서 반환받은 이미지 URL 배열
}

// fastapi로 이미지 전송, 결과 받아오는 코드
// base64 문자열을 Blob 형식으로 변환하는 헬퍼 함수
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// 이미지를 서버에 업로드하고 이미지 URL 배열을 반환하는 함수
const uploadImagesToServer = async (
  images: string[],
  productInfo: { name: string; price: string; description: string }
): Promise<string[]> => {
  if (images.length === 0) return [];

  try {
    const formData = new FormData();

    // 이미지 추가
    images.forEach((imageDataUrl, index) => {
      const blob = dataURLtoBlob(imageDataUrl);
      formData.append('images', blob, `image_${index}.jpg`);
    });

    // 🧩 추가: 제품 정보 필수
    formData.append('product_name', productInfo.name);
    formData.append('price', productInfo.price);
    formData.append('description', productInfo.description);

    const response = await fastapiInstance.post('/upload-info', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log("✅ POST 요청 성공");
    console.log("🔄 response 객체:", response);
    console.log("🟢 response.data:", response.data);
    return response.data.image_urls;
  } catch (error) {
    console.error("이미지 업로드 실패:", error);
    throw new Error("이미지 업로드에 실패했습니다.");
  }
};

// 프론트엔드에 추가할 함수 - 기존 uploadImagesToServer 함수 아래에 추가
const generateSalesContent = async (
  images: string[],
  productInfo: { 
    name: string; 
    price: string; 
    serialNumber: string;
    purchaseDate: string;
    configuration: number;
  }
): Promise<{ title: string; description: string; imageUrls: string[] }> => {
  if (images.length === 0) {
    throw new Error("이미지를 최소 1장 이상 촬영해주세요.");
  }

  try {
    const formData = new FormData();

    // 이미지 추가
    images.forEach((imageDataUrl, index) => {
      const blob = dataURLtoBlob(imageDataUrl);
      formData.append('images', blob, `image_${index}.jpg`);
    });

    // 제품 정보 추가
    formData.append('product_name', productInfo.name);
    formData.append('price', productInfo.price);
    formData.append('serial_number', productInfo.serialNumber);
    formData.append('purchase_date', productInfo.purchaseDate);
    formData.append('configuration', productInfo.configuration.toString());

    // 판매글 생성 API 호출
    const response = await fastapiInstance.post('/generate-description', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log("✅ 판매글 생성 요청 성공");
    console.log("🔄 response 객체:", response);
    console.log("🟢 response.data:", response.data);
    
    return {
      title: response.data.title,
      description: response.data.description,
      imageUrls: response.data.image_urls || []
    };
  } catch (error) {
    console.error("판매글 생성 실패:", error);
    throw new Error("판매글 생성에 실패했습니다.");
  }
};

// fastapi로 이미지 전송, 결과 받아오는 코드 끝

const GoodsRegistrationPage: React.FC = () => {
  const location = useLocation();
  // const editItem = location.state as
  //   | (ExtendedGoodsData & { itemId?: string })
  //   | undefined;
  const editItem =
    location.state && "title" in location.state
      ? (location.state as ExtendedGoodsData & { itemId?: string })
      : undefined;

  const navigate = useNavigate();
  // 현재 년도 구하기
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) =>
    (currentYear - i).toString()
  );

  // const [formData, setFormData] = useState<ExtendedGoodsData>({
  //   title: location.state.title,
  //   description: location.state.description,
  //   price: location.state.price, // This is causing the error
  //   // images: [],
  //   purchaseDate: location.state.purchaseDate,
  //   grades: location.state.grades,
  //   status: location.state.status,
  //   configuration: location.state.configuration, // 구성품 0: 풀박 / 1: 일부 / 2: 단품
  //   scratchesStatus: location.state.scratchesStatus,
  //   createdAt: location.state.createdAt,
  //   serialNumber: location.state.serialNumber,

  //   purchaseYear: currentYear.toString(),
  //   purchaseMonth: "0",
  // });

  const [formData, setFormData] = useState<ExtendedGoodsData>(() => {
    if (editItem) {
      return {
        title: editItem.title,
        description: editItem.description,
        price: editItem.price,
        purchaseDate: editItem.purchaseDate,
        grades: editItem.grades,
        status: editItem.status,
        configuration: editItem.configuration,
        scratchesStatus: editItem.scratchesStatus,
        createdAt: editItem.createdAt,
        serialNumber: editItem.serialNumber,
        purchaseYear:
          editItem.purchaseDate?.split("-")[0] || currentYear.toString(),
        purchaseMonth: editItem.purchaseDate?.split("-")[1] || "0",
        images: [], // 빈 이미지 배열로 초기화
        imageUrls: editItem.imageUrls || [], // 기존 이미지 URL이 있으면 사용
      };
    } else {
      return {
        title: "",
        description: "",
        price: 0,
        purchaseDate: "",
        grades: true,
        status: true,
        configuration: 0,
        scratchesStatus: "",
        createdAt: "",
        serialNumber: "",
        purchaseYear: currentYear.toString(),
        purchaseMonth: "0",
        images: [], // 빈 이미지 배열로 초기화
      };
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  // 입력 필드 변경 처리
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 가격 입력 처리
  const handlePriceChange = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      price: value,
    }));
  };

  // 시리얼 번호 입력 처리
  const handleSerialNumberChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      serialNumber: value,
    }));
  };
  
  // 구성여부 변경 처리
  const handlePackageTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as PackageType;

    const configValueMap: Record<PackageType, number> = {
      full: 0,
      partial: 1,
      single: 2,
    };

    setFormData((prev) => ({
      ...prev,
      configuration: configValueMap[selected], // ✅ 숫자로 저장
      packageType: selected, // 표시용으로 유지
    }));
  };

  // 이미지 선택 처리
  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files.length > 0) {
  //     // 파일 배열로 변환
  //     const fileArray = Array.from(e.target.files);
  //     setFormData((prev) => ({
  //       ...prev,
  //       images: fileArray,
  //     }));
  //   }
  // };
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  // 이미지 캡처 콜백
  const handleImageCapture = (imageDataUrl: string) => {
    setCapturedImages((prev) => [...prev, imageDataUrl]);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, imageDataUrl],
    }));
  };

  // 판매글 생성 처리 - handleSubmit 함수 위에 추가
  const handleGenerateContent = async () => {
    // 필수 필드 검증
    if (
      !formData.title.trim() ||
      typeof formData.price !== "number" ||
      isNaN(formData.price) ||
      formData.price <= 0 ||
      !formData.purchaseYear ||
      formData.serialNumber.trim().length === 0 ||
      formData.images.length === 0
    ) {
      alert("상품명, 가격, 구매 년도, 시리얼 번호는 필수 입력 항목이며, 최소 1장의 이미지가 필요합니다.");
      return;
    }

    try {
      setIsGenerating(true);
      
      // 구매일자 YYYY-MM 포맷
      const purchaseDateString =
        formData.purchaseMonth === "0"
          ? formData.purchaseYear
          : `${formData.purchaseYear}-${formData.purchaseMonth.padStart(2, "0")}`;

      // 판매글 생성 API 호출
      const { title, description, imageUrls } = await generateSalesContent(
        formData.images,
        {
          name: formData.title,
          price: formData.price.toString(),
          serialNumber: formData.serialNumber,
          purchaseDate: purchaseDateString,
          configuration: formData.configuration
        }
      );

      // 생성된 판매글 설정
      setFormData((prev) => ({
        ...prev,
        title: title, // 제목도 AI가 생성한 것으로 업데이트
        description: description,
        imageUrls: imageUrls
      }));
      
      setIsGenerated(true);
      alert("판매글이 생성되었습니다. 내용을 확인하고 등록해주세요.");
      
    } catch (error) {
      console.error("판매글 생성 오류:", error);
      alert("판매글 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };
  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (
      !formData.title.trim() ||
      typeof formData.price !== "number" ||
      isNaN(formData.price) ||
      formData.price <= 0 ||
      !formData.purchaseYear ||
      formData.serialNumber.trim().length === 0
    ) {
      alert("상품명, 가격, 구매 년도, 시리얼 번호는 필수 입력 항목입니다.");
      return;
    }

    try {
      setIsLoading(true);
      // ⬇️ purchaseDate YYYY-MM 포맷
      const purchaseDateString =
        formData.purchaseMonth === "0"
          ? formData.purchaseYear
          : `${formData.purchaseYear}-${formData.purchaseMonth.padStart(2, "0")}`;

      let finalDescription = formData.description;
      if (
        formData.configuration === 1 &&
        !finalDescription.includes("구성품:")
      ) {
        finalDescription = `구성품 안내가 필요합니다. 어떤 구성품이 포함되어 있는지 작성해주세요.\n\n${finalDescription}`;
      }

      // 구매일자 및 구성여부 정보 추가
      // const packageTypeText = {
      //   full: "풀박스",
      //   single: "단품",
      //   partial: "일부구성품",
      // }[formData.configuration];

      console.log("formData.serialNumber:", formData.serialNumber);

      // 최종 설명에 구매일자와 구성여부 정보 포함
      finalDescription = `${finalDescription}`;
      // finalDescription = `구매일자: ${purchaseDateString}\n구성여부: ${packageTypeText}\n\n${finalDescription}`;
      const date = new Date().toISOString();
      console.log(date);
      // const now = new Date();
      // const kstOffset = 9 * 60 * 60 * 1000; // 9시간(한국 시차)을 밀리초로 변환
      // const kstDate = new Date(now.getTime() + kstOffset);

      // const date = kstDate.toISOString().replace("Z", "+09:00");
      // console.log(date); // 예: 2025-04-25T20:45:00+09:00

      // 1. 이미지 업로드 처리
      let imageUrls: string[] = [];
      if (formData.images.length > 0) {
        try {
          // 기존에 정의한 uploadImagesToServer 함수 사용
          // 이미지와 함께 제품 정보도 전달
          imageUrls = await uploadImagesToServer(formData.images, {
            name: formData.title,
            price: formData.price.toString(),
            description: finalDescription
          });
          console.log("업로드된 이미지 URL:", imageUrls);
        } catch (error) {
          console.error("이미지 업로드 실패:", error);
          alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
          setIsLoading(false);
          return;
        }
      }

      // 상품 등록 API 호출
      const submissionData = {
        ...formData,
        description: finalDescription,
        price: formData.price, // 만원 단위를 원 단위로 변환 (예: 67 -> 670000)
        purchaseDate: purchaseDateString,
        createdAt: date.toString(),
        serialNumber: formData.serialNumber,
        imageUrls: imageUrls, // 업로드된 이미지 URL 배열 추가
      };

      console.log("submission: ", submissionData);
      
      if (editItem && editItem.itemId) {
        // TODO: 수정 API 호출 (예: await putGoods(itemId, submissionData))

        try {
          const goodsId = parseInt(editItem.itemId);
          console.log("submissionData: ", {
            ...submissionData,
            itemId: goodsId,
          });
          const response = await postGoodsEdit({
            ...submissionData,
            itemId: goodsId,
          });
          alert("상품 수정이 완료되었습니다.");
          console.log("response: ", response);
          navigate(`/goods/detail/${editItem.itemId}`);
        } catch (error) {
          console.log("상품 상세 수정 실패 : ", error);
        }
      } else {
        // await postGoods(submissionData);
        // const response = await registerGoods(submissionData);
        const response = await postGoods(submissionData);

        console.log("등록된 상품 정보:", response);

        // if (response.data)
        // 성공 시 상품 목록 페이지로 이동
        alert("상품이 등록되었습니다.");
        navigate("/my-posts");
      }
    } catch (error) {
      console.error("상품 등록 오류:", error);
      alert("상품 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container h-screen mx-auto text-first">
      <Header showBackButton={true} title="LOGO" hideSearchButton={true} />

      <div className="font-semibold mb-4 flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* 1. 상품 정보 입력 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">상품명</label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="상품명을 입력하세요" />
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">구매일자</label>
            <div className="flex space-x-2">
              <div className="w-1/2">
                <select id="purchaseYear" name="purchaseYear" value={formData.purchaseYear} onChange={handleInputChange} className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                  <option value="" disabled>년도 선택</option>
                  {yearOptions.map((year) => <option key={year} value={year}>{year}년</option>)}
                </select>
              </div>
              <div className="w-1/2">
                <select id="purchaseMonth" name="purchaseMonth" value={formData.purchaseMonth} onChange={handleInputChange} className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="0">기억 안남</option>
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((month) => <option key={month} value={month}>{month}월</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">시리얼 넘버</label>
            <SerialNumberInput id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleSerialNumberChange} />
          </div>

          <div>
            <label htmlFor="packageType" className="block text-sm font-medium text-gray-700 mb-1">구성여부</label>
            <select id="packageType" name="packageType" value={formData.configuration} onChange={handlePackageTypeChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="full">풀박스</option>
              <option value="single">단품</option>
              <option value="partial">일부구성품</option>
            </select>
            {formData.configuration === 1 && (
              <p className="mt-1 text-sm text-red-500">일부구성품을 선택하신 경우, 상품설명에 포함된 구성품을 자세히 적어주세요.</p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">가격</label>
            <PriceInput id="price" name="price" value={formData.price} onChange={handlePriceChange} />
          </div>

          {/* 2. 사진 촬영 */}
          <div className="flex justify-between items-baseline">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사진 촬영하기
            </label>
            <div className="flex items-center">
              <button
                onClick={() => setIsCameraOpen(true)}
                className="px-3 py-2 rounded-md bg-second/60 text-white text-sm"
              >
                촬영하기
              </button>
            </div>
          </div>
          {capturedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {capturedImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`captured-${index}`}
                  className="h-24 rounded"
                />
              ))}
            </div>
          )}
          {isCameraOpen && (
            <CameraModal
              onClose={() => setIsCameraOpen(false)}
              onCapture={handleImageCapture}
            />
          )}

          {/* 3. 게시글 생성 버튼 */}
          {capturedImages.length > 0 && !isGenerated && (
            <div className="mt-2">
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating}
                className="w-full py-3 bg-first text-white font-medium rounded-md"
              >
                {isGenerating ? "게시글 생성 중..." : "게시글 생성하기"}
              </button>
              <p className="mt-2 text-sm text-gray-500 text-center">
                상품 이미지를 모두 업로드한 후 게시글 생성을 진행해주세요.
              </p>
            </div>
          )}


          {/* 4. 판매글 생성 버튼 */}
          {isGenerated && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">생성된 판매글</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  {formData.title}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품설명
                </label>
                <div
                  className="p-3 bg-gray-50 rounded-md border whitespace-pre-line"
                  style={{ maxHeight: '300px', overflowY: 'auto' }}
                >
                  {formData.description}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  * 판매글은 AI로 자동 생성되었습니다. 내용을 확인하고 등록해주세요.
                </p>
              </div>
            </div>
          )}

          {/* 5. 직접 입력하는 상품설명 (맨 마지막) */}
          {isGenerated && (
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">상품설명</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={formData.configuration === 1 ? "어떤 구성품이 포함되어 있는지 자세히 작성해주세요." : "상품 설명을 입력하세요."}
              />
            </div>
          )}
        </div>
      </div>

      {/* 6. 하단 버튼 */}
      <div className="flex-1 px-3 py-7 bg-white flex gap-2 grid grid-cols-6">
        <button type="button" onClick={handleCancel} disabled={isLoading || isGenerating} className="col-span-2 flex-1 py-3 bg-first/60 text-white font-medium rounded-md">취소하기</button>
        {isGenerated ? (
          <button type="button" onClick={handleSubmit} disabled={isLoading} className="col-span-4 flex-1 py-3 bg-second text-white font-medium rounded-md">
            {editItem ? "수정하기" : isLoading ? "등록 중..." : "등록하기"}
          </button>
        ) : (
          <button type="button" disabled className="col-span-4 flex-1 py-3 bg-gray-300 text-gray-500 font-medium rounded-md">
            {editItem ? "수정하기" : "등록하기"}
          </button>
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <NavigationBar />
    </div>

  );
};

export default GoodsRegistrationPage;