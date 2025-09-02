'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBiasTestStore } from '@/lib/store';
import { getTranslation } from '@/lib/i18n';
import { getBiasCategory } from '@/data/solutions';
import { ShareButton } from '@/components/ui/ShareButton';
import { ResultChart } from '@/components/ui/ResultChart';

export default function ResultPage() {
  const router = useRouter();
  const { result, userProfile, language, resetTest } = useBiasTestStore();
  const t = getTranslation(language);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return; // 한 번만 실행
    
    console.log('🏁 === Result Page 초기화 시작 ===');
    console.log('📊 result:', !!result);
    console.log('👤 userProfile.name:', userProfile.name);
    
    const initializePage = async () => {
      try {
        // 디버깅을 위한 상세 로깅
        console.log('🔍 Result page initialization debug:', {
          result: result ? { 
            percentage: result.percentage, 
            totalScore: result.totalScore, 
            category: result.category,
            completedAt: result.completedAt,
            completedAtType: typeof result.completedAt
          } : null,
          userProfileName: userProfile.name,
          windowType: typeof window,
          sessionStorageCompleted: typeof window !== 'undefined' ? sessionStorage.getItem('test-completed') : 'unavailable'
        });
        
        // 1. 결과 데이터가 있으면 즉시 표시
        if (result && result.percentage !== undefined) {
          console.log('✅ 결과 데이터 존재 - 즉시 표시');
          setIsLoading(false);
          setHasInitialized(true);
          return;
        }
        
        // 2. 결과 데이터가 없으면 백업 복구 시도
        console.log('⚠️ 결과 데이터 없음 - 백업 복구 시도');
        
        if (typeof window !== 'undefined') {
          const backup = localStorage.getItem('bias-test-result-backup');
          if (backup) {
            try {
              const backupData = JSON.parse(backup);
              
              // 백업 데이터 유효성 확인
              if (backupData.result && backupData.result.percentage !== undefined) {
                console.log('💾 백업 데이터로 복구');
                
                const { setResult: storeSetResult, setUserProfile } = useBiasTestStore.getState();
                storeSetResult(backupData.result);
                if (backupData.userProfile) {
                  setUserProfile(backupData.userProfile);
                }
                
                setIsLoading(false);
                setHasInitialized(true);
                return;
              }
            } catch (error) {
              console.error('백업 데이터 파싱 오류:', error);
              localStorage.removeItem('bias-test-result-backup');
            }
          }
        }
        
        // 3. 복구 실패 시 홈으로 리다이렉트
        console.log('❌ 복구 실패 - 홈으로 이동');
        setTimeout(() => {
          alert('테스트 결과를 찾을 수 없습니다.\n다시 테스트를 진행해주세요.');
          router.push('/');
        }, 1000);
        
      } catch (error) {
        console.error('페이지 초기화 오류:', error);
        alert('오류가 발생했습니다. 다시 테스트를 진행해주세요.');
        router.push('/');
      }
      
      setHasInitialized(true);
    };
    
    initializePage();
  }, [result, userProfile, router, hasInitialized]);

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 결과 데이터가 없으면 에러 페이지
  if (!result || result.percentage === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">결과를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">테스트를 다시 진행해주세요.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  // getBiasCategory는 항상 fallback을 반환하므로 단순하게 처리
  console.log('getBiasCategory 호출:', result.percentage);
  const biasCategory = getBiasCategory(result.percentage);
  console.log('biasCategory 결과:', biasCategory);

  const handleRetakeTest = () => {
    resetTest();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-mobile mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              www.areyoubiased.life
            </span>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="px-4 py-4">
        <div className="max-w-mobile mx-auto">
          {/* 광고 공간 - 상단 (컨테이너 외부) */}
          <div className="mb-3" data-hide-in-export="true">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>

          {/* 통합된 결과 컨테이너 - 동적 높이로 변경 */}
          <div id="result-container" className="bg-white rounded-xl shadow-lg overflow-visible" style={{ width: '100%', maxWidth: '100%', minHeight: '600px' }}>
            <ResultChart
              percentage={result.percentage}
              category={result.category}
              userName={userProfile.name}
              size="md"
              className="p-4 pb-2"
              showGradientBar={true}
              translations={{
                biasRange: t.result.biasRange,
                veryLow: t.result.veryLow,
                low: t.result.low,
                moderate: t.result.moderate,
                high: t.result.high,
                veryHigh: t.result.veryHigh,
                biasLabel: t.result.biasLabel,
                objectivityLabel: t.result.objectivityLabel,
                yourScore: t.result.yourScore,
                yourScoreWithName: t.result.yourScoreWithName
              }}
            />
            
            <div className="px-4 pb-4">
              {/* 카테고리 제목 표시 */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {biasCategory.title[language]}
                </h3>
              </div>

              {/* 분석 결과 */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t.result.analysis}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {biasCategory.description[language]}
                </p>
              </div>

              {/* 맞춤 솔루션 */}
              <div className="mb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {t.result.solutions}
                </h3>
                <div className="text-gray-700 leading-relaxed space-y-2">
                  {(biasCategory.solutions && Array.isArray(biasCategory.solutions[language]) 
                    ? biasCategory.solutions[language] 
                    : t.result.solutionItems || []
                  ).map((solution: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-0.5 text-sm">•</span>
                      <span className="text-sm leading-relaxed">{solution}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 광고 공간 - 하단 (컨테이너 외부) */}
          <div className="mt-3" data-hide-in-export="true">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>

          {/* 액션 버튼들 - 광고 하단 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4" data-hide-in-export="true">
            <ShareButton 
              resultElementId="result-container"
              percentage={result.percentage}
              className="px-6 py-2 text-base"
              buttonText={t.result.shareButton}
            />
            
            <button
              onClick={handleRetakeTest}
              className="inline-flex items-center justify-center px-6 py-2 bg-gray-500 text-white rounded-lg font-medium text-base hover:bg-gray-600 transition-colors"
            >
              {t.result.retakeTest}
            </button>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-6 mt-8">
        <div className="max-w-mobile mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 Are You Biased. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-1">
            https://areyoubiased.life
          </p>
        </div>
      </footer>
    </div>
  );
}