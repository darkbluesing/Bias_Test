'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBiasTestStore } from '@/lib/store';
import { getTranslation, detectLanguageFromBrowser } from '@/lib/i18n';
import { useHydration } from '@/lib/useHydration';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const [name, setName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const { language, setLanguage, setUserProfile } = useBiasTestStore();
  const t = getTranslation(language);

  // 초기 언어 감지 (hydration 완료 후)
  useEffect(() => {
    if (!isHydrated) return;
    
    const detectedLang = detectLanguageFromBrowser();
    setLanguage(detectedLang);
  }, [isHydrated, setLanguage]);

  const handleStartTest = async () => {
    // 중복 실행 방지
    if (isStarting) {
      console.log('이미 시작 중 - 무시');
      return;
    }

    console.log('handleStartTest 호출됨', { name: name.trim() });
    
    if (!name.trim()) {
      alert(t.error.nameRequired);
      return;
    }

    setIsStarting(true);
    console.log('사용자 프로필 설정 중...', { name: name.trim() });
    
    try {
      // 상태 업데이트
      setUserProfile({ name: name.trim() });
      
      // 상태가 저장될 시간을 충분히 확보
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('페이지 이동 시작...');
      
      // 즉시 이동 - 단일 클릭으로 작동
      window.location.href = '/test';
      
    } catch (error) {
      console.error('테스트 시작 중 오류:', error);
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh' }}>
      {/* 헤더 */}
      <header className="px-4 py-6">
        <div className="max-w-mobile mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Are You Biased?
            </h1>
          </div>
          <LanguageSelector className="w-40" />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="px-4 py-12">
        <div className="max-w-mobile mx-auto">
          {/* 광고 공간 - 상단 배너 */}
          <div className="mb-3">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>

          {/* 확장된 테스트 시작 카드 - 제목/설명 포함 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-3" style={{ minHeight: '500px' }}>
            <div className="max-w-2xl mx-auto">
              {/* 제목과 설명을 카드 내부로 이동 */}
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  {t.welcome.title}
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                  {t.welcome.subtitle}
                </p>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  {t.welcome.description}
                </p>
              </div>

              {/* 이름 입력 섹션 */}
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    {t.welcome.nameInput}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.welcome.namePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleStartTest();
                      }
                    }}
                  />
                </div>
                
                <div className="relative" style={{ height: '60px' }}>
                  <Button
                    onClick={handleStartTest}
                    loading={isStarting}
                    size="lg"
                    fullWidth
                    className="text-lg py-4 h-[60px] absolute inset-0"
                    style={{ transform: 'none', boxShadow: 'none' }}
                  >
                    {t.welcome.startButton}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 광고 공간 - 하단 배너 */}
          <div className="mb-8">
            <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-500 text-sm">
              광고 공간 (728x90 / 320x50)
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-mobile mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 Are You Biased. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            https://areyoubiased.life
          </p>
        </div>
      </footer>
    </div>
  );
}