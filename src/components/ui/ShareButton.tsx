'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';

interface ShareButtonProps {
  resultElementId: string;
  percentage: number;
  className?: string;
  buttonText?: string;
}

export function ShareButton({ 
  resultElementId, 
  percentage, 
  className = '', 
  buttonText = '결과 다운로드' 
}: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // 폰트 로딩 완료 대기 함수
  const waitForFonts = async (): Promise<void> => {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        console.log('✅ 폰트 로딩 완료');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn('⚠️ 폰트 로딩 대기 실패:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Canvas를 Blob으로 변환하는 함수
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          reject(new Error('Blob 생성 실패'));
        }
      }, 'image/png', 1.0);
    });
  };

  // 이미지 다운로드 함수
  const downloadImage = (blob: Blob, fileName: string): boolean => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log('✅ 다운로드 성공');
      return true;
    } catch (error) {
      console.error('❌ 다운로드 실패:', error);
      return false;
    }
  };

  // 새 창에서 이미지 표시
  const showImageInNewWindow = (canvas: HTMLCanvasElement) => {
    try {
      const dataURL = canvas.toDataURL('image/png', 1.0);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>편견 테스트 결과</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  background: #f0f0f0; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                }
                img { 
                  max-width: 100%; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                  border-radius: 8px; 
                }
              </style>
            </head>
            <body>
              <img src="${dataURL}" alt="편견 테스트 결과" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('❌ 새 창 표시 실패:', error);
    }
  };

  // 메인 다운로드 함수
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    console.log('🚀 === 결과 컨테이너 이미지 다운로드 시작 ===');
    
    try {
      // 1. 결과 컨테이너 요소 확인
      const element = document.getElementById(resultElementId);
      if (!element) {
        throw new Error(`결과 컨테이너를 찾을 수 없습니다: ${resultElementId}`);
      }
      
      console.log('✅ 결과 컨테이너 확인:', {
        id: element.id,
        width: element.offsetWidth,
        height: element.offsetHeight,
        visible: element.offsetParent !== null
      });

      // 2. 완전한 렌더링 상태 확보
      console.log('⏳ 완전한 렌더링 대기...');
      await waitForFonts();
      
      // 차트 애니메이션 완전 완료 대기
      console.log('🎨 차트 애니메이션 완료 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // 브라우저 리플로우/리페인트 완료 대기
      await new Promise(resolve => requestAnimationFrame(() => 
        requestAnimationFrame(() => resolve(undefined))
      ));
      
      console.log('✅ 렌더링 상태 완전 준비 완료');

      // 3. html2canvas로 최적화된 PNG 생성
      console.log('📸 html2canvas 실행 중...');
      
      const canvas = await html2canvas(element, {
        backgroundColor: "#fff",  // 요구사항: 흰색 배경
        scale: 2,                 // 요구사항: 고해상도
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 20000,
        width: element.scrollWidth,
        height: element.scrollHeight,
        // 브라우저 네이티브 렌더링 최대 활용
        foreignObjectRendering: true,
        onclone: (clonedDoc: Document) => {
          try {
            // 광고와 버튼만 숨김
            const hideElements = clonedDoc.querySelectorAll('[data-hide-in-export="true"], [data-share-button]');
            hideElements.forEach(el => {
              (el as HTMLElement).style.display = 'none';
            });
            
            // 애니메이션 완료 상태로 고정
            const animatedElements = clonedDoc.querySelectorAll('[class*="chart-"]');
            animatedElements.forEach(el => {
              (el as HTMLElement).style.animation = 'none';
            });
            
            console.log(`✅ ${hideElements.length}개 요소 숨김, ${animatedElements.length}개 애니메이션 고정`);
          } catch (error) {
            console.warn('DOM 처리 중 오류:', error);
          }
        }
      });

      console.log('✅ 캔버스 생성 성공:', {
        width: canvas.width,
        height: canvas.height,
        estimatedSize: `${Math.round(canvas.width * canvas.height * 4 / 1024)}KB`
      });

      // 4. PNG 파일로 다운로드
      const blob = await canvasToBlob(canvas);
      console.log(`✅ Blob 생성 성공: ${Math.round(blob.size / 1024)}KB`);
      
      const success = downloadImage(blob, 'result.png');
      
      if (success) {
        alert('결과 이미지가 성공적으로 다운로드되었습니다!');
      } else {
        showImageInNewWindow(canvas);
        alert('다운로드가 지원되지 않아 새 창에서 이미지를 표시했습니다.\n이미지를 우클릭하여 저장할 수 있습니다.');
      }
      
      console.log('🎉 이미지 처리 완료!');

    } catch (error) {
      console.error('❌ 이미지 생성 오류:', error);
      
      // 재시도 1회 (간단한 설정으로)
      console.log('🔄 간단한 설정으로 재시도...');
      try {
        const element = document.getElementById(resultElementId);
        if (element) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const canvas = await html2canvas(element, {
            backgroundColor: "#fff",
            scale: 1,
            useCORS: false,
            allowTaint: true,
            logging: false,
            imageTimeout: 10000
          });
          
          const blob = await canvasToBlob(canvas);
          const success = downloadImage(blob, 'result.png');
          
          if (success) {
            alert('결과 이미지가 성공적으로 다운로드되었습니다!');
          } else {
            showImageInNewWindow(canvas);
            alert('다운로드가 지원되지 않아 새 창에서 이미지를 표시했습니다.\n이미지를 우클릭하여 저장할 수 있습니다.');
          }
          console.log('✅ 재시도 성공');
        }
      } catch (retryError) {
        console.error('❌ 재시도도 실패:', retryError);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        alert(`이미지 생성에 실패했습니다.\n\n오류: ${errorMsg}\n\n다음을 시도해보세요:\n• 페이지를 새로고침하고 다시 시도\n• 다른 브라우저 사용\n• 브라우저 설정 확인`);
      }
      
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownloadImage}
      disabled={isGenerating}
      className={`inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isGenerating ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          이미지 생성 중...
        </>
      ) : (
        <>
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          {buttonText}
        </>
      )}
    </button>
  );
}