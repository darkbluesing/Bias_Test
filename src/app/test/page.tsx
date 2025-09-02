'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBiasTestStore } from '@/lib/store';
import { getTranslation } from '@/lib/i18n';
import { generateAllQuestions } from '@/data/questions';
import { biasCalculator } from '@/lib/biasCalculator';
import { useHydration } from '@/lib/useHydration';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuestionCard } from '@/components/ui/QuestionCard';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { DebugPanel } from '@/components/DebugPanel';

export default function TestPage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const [questions] = useState(generateAllQuestions());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    currentQuestion,
    language,
    userProfile,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    setResult,
    getCurrentAnswer,
    isTestCompleted
  } = useBiasTestStore();

  const t = getTranslation(language);

  // Hydration이 완료되고 이름이 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!isHydrated) return; // hydration 완료까지 대기

    console.log('테스트 페이지 - 사용자 프로필 확인:', userProfile);
    
    if (!userProfile.name) {
      console.log('사용자 이름이 없어서 홈으로 리다이렉트');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
      return;
    }
  }, [isHydrated, userProfile, router]);

  // Hydration이 완료되지 않았으면 로딩 화면 표시
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];

  // 🎯 통합 결과 처리 함수 (강화된 디버깅)
  const processTestCompletion = async () => {
    console.log('🚀 === 테스트 완료 처리 시작 ===');
    
    try {
      // 상태 저장 완료를 위한 충분한 대기
      console.log('⏳ Zustand 상태 업데이트 대기...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 최신 답변 상태 가져오기
      const latestAnswers = useBiasTestStore.getState().answers;
      console.log('📊 최종 답변 상태 검증:', {
        answersLength: latestAnswers.length,
        validCount: latestAnswers.filter(a => typeof a === 'number').length,
        invalidCount: latestAnswers.filter(a => a === undefined || a === null).length,
        firstFive: latestAnswers.slice(0, 5),
        lastFive: latestAnswers.slice(-5)
      });
      
      // 답변 배열 기본 검증
      if (!Array.isArray(latestAnswers)) {
        throw new Error('답변이 배열이 아닙니다');
      }
      
      if (latestAnswers.length !== 40) {
        throw new Error(`답변 배열 길이 오류: ${latestAnswers.length}/40`);
      }
      
      // 미답변 질문 확인
      const invalidIndices: number[] = [];
      latestAnswers.forEach((answer, index) => {
        if (answer === undefined || answer === null) {
          invalidIndices.push(index + 1);
        }
      });
      
      if (invalidIndices.length > 0) {
        console.error('❌ 미답변 질문들:', invalidIndices);
        throw new Error(`미답변 질문 ${invalidIndices.length}개: ${invalidIndices.slice(0, 10).join(', ')}${invalidIndices.length > 10 ? '...' : ''}`);
      }
      
      // 결과 계산
      console.log('🧮 결과 계산 시작...');
      const result = biasCalculator.calculateResult([...latestAnswers], language);
      console.log('✅ 결과 계산 완료:', {
        totalScore: result.totalScore,
        percentage: result.percentage,
        category: result.category
      });
      
      // 결과 저장 (여러 방법으로 안전하게)
      console.log('💾 결과 저장 중...');
      setResult(result);
      
      // 상태 저장 완료 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 저장 확인
      const savedResult = useBiasTestStore.getState().result;
      if (!savedResult) {
        console.error('❌ 결과 저장 실패 - 재시도');
        setResult(result);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('✅ 결과 저장 확인:', !!useBiasTestStore.getState().result);
      
      // 백업 저장
      try {
        const backupData = { result, userProfile, timestamp: Date.now(), answers: latestAnswers };
        localStorage.setItem('bias-test-result-backup', JSON.stringify(backupData));
        console.log('💾 백업 저장 완료');
      } catch (storageError) {
        console.warn('⚠️ 백업 저장 실패:', storageError);
      }
      
      // 결과 페이지로 이동
      console.log('🎯 결과 페이지로 이동 중...');
      
      // 테스트 완료 플래그 설정 (직접 접근 방지용)
      sessionStorage.setItem('test-completed', 'true');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      window.location.href = '/result';
      
    } catch (error) {
      console.error('❌ 테스트 완료 처리 오류:', error);
      console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음');
      alert(`테스트 완료 중 오류 발생:\n${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n개발자 도구의 콘솔을 확인해주세요.`);
      setIsProcessing(false);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    console.log(`=== 질문 ${currentQuestion + 1} 답변 처리 시작: 옵션 ${optionIndex} ===`);
    
    // 중복 실행 방지
    if (isProcessing) {
      console.log('❌ 이미 처리 중 - 무시');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 답변 저장 (옵션 인덱스를 점수로 변환)
      // 첫 10개 질문은 프로필 질문이므로 점수 계산에서 제외하고 옵션 인덱스만 저장
      // 나머지 30개 질문(편견 질문)은 옵션 인덱스를 점수로 사용 (0=낮음, 1=중간, 2=높음)
      console.log('📝 답변 저장 중...');
      submitAnswer(optionIndex);
      
      // 상태 업데이트 완료 대기 (Zustand의 비동기 상태 업데이트)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 마지막 질문(40번째)인지 확인
      const isLastQuestion = currentQuestion === questions.length - 1;
      console.log(`🔍 마지막 질문 여부: ${isLastQuestion} (${currentQuestion + 1}/40)`);
      
      if (isLastQuestion) {
        console.log('🎯 마지막 질문 - 테스트 완료 처리 시작');
        await processTestCompletion();
      } else {
        console.log('➡️ 다음 질문으로 이동');
        nextQuestion();
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ 답변 처리 오류:', error);
      alert('답변 처리 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  const handleNext = async () => {
    // 중복 실행 방지
    if (isProcessing) {
      console.log('Next: 이미 처리 중 - 무시');
      return;
    }
    
    const currentAnswer = getCurrentAnswer();
    if (currentAnswer === undefined) {
      alert(t.error.answerRequired);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 마지막 질문인지 확인
      if (currentQuestion === questions.length - 1) {
        console.log('Next: 마지막 질문 - 테스트 완료 처리');
        await processTestCompletion();
      } else {
        console.log('Next: 다음 질문으로 이동');
        nextQuestion();
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Next 버튼 오류:', error);
      alert('오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  const handlePrevious = () => {
    if (isProcessing) {
      console.log('Previous: 이미 처리 중 - 무시');
      return;
    }
    
    previousQuestion();
  };

  const handleSubmitTest = async () => {
    console.log('Submit: 테스트 완료 처리');
    
    // 중복 실행 방지
    if (isProcessing) {
      console.log('Submit: 이미 처리 중 - 무시');
      return;
    }
    
    if (!isTestCompleted()) {
      alert(t.error.testIncomplete);
      return;
    }
    
    setIsProcessing(true);
    await processTestCompletion();
  };

  if (!userProfile.name || !currentQuestionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh' }}>
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

      {/* 프로그레스 바 - 상단 고정 */}
      <div className="bg-white px-4 py-4 border-b sticky top-0 z-10">
        <div className="max-w-mobile mx-auto">
          <ProgressBar
            progress={Math.round(((currentQuestion + 1) / questions.length) * 100)}
            className="mb-2"
          />
          <p className="text-center text-sm text-gray-600">
            {t.test.question} {currentQuestion + 1} {t.test.of} {questions.length}
          </p>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="px-4 py-8">
        <div className="max-w-mobile mx-auto" style={{ minHeight: '80vh' }}>
          {/* 광고 공간 - 상단 */}
          <div className="mb-3">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>


          {/* 질문 카드 */}
          <QuestionCard
            question={currentQuestionData}
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            selectedAnswer={getCurrentAnswer()}
            onAnswerSelect={handleAnswer}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isFirstQuestion={currentQuestion === 0}
            isLastQuestion={currentQuestion === questions.length - 1}
            translations={t.test}
            className=""
          />

          {/* 광고 공간 - 하단 */}
          <div className="mt-3 mb-6">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>

          {/* 네비게이션 버튼 - 고정 크기로 안정화 */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isProcessing}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] h-[48px]"
            >
              ← 이전
            </button>

            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={getCurrentAnswer() === undefined || isProcessing}
                className="inline-flex items-center justify-center px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] h-[48px]"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    처리 중...
                  </>
                ) : (
                  <>다음 →</>
                )}
              </button>
            ) : (
              <button
                onClick={handleSubmitTest}
                disabled={!isTestCompleted() || isProcessing}
                className="inline-flex items-center justify-center px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] h-[48px]"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    완료 처리 중...
                  </>
                ) : (
                  '테스트 완료'
                )}
              </button>
            )}
          </div>
        </div>
      </main>
      
      {/* Development Debug Panel */}
      <DebugPanel />
    </div>
  );
}