import { getBiasCategory, mapToMainCategory } from '@/data/solutions';
import { TestResult, SupportedLanguage } from '@/types';

export class BiasCalculator {
  private readonly maxScore: number;
  private readonly totalQuestions: number;
  private readonly profileQuestions: number = 10; // 첫 10개는 프로필 질문
  private readonly biasQuestions: number = 30; // 나머지 30개는 편견 질문

  constructor(totalQuestions: number = 40, maxScorePerQuestion: number = 2) {
    this.totalQuestions = totalQuestions;
    // 편견 점수는 30개 질문 * 최대 2점(0,1,2 중 최대값)으로 계산
    this.maxScore = this.biasQuestions * maxScorePerQuestion;
  }

  /**
   * 테스트 결과를 계산합니다
   * @param answers 사용자 답변 배열 (각 답변의 점수)
   * @param language 언어 설정
   * @returns 테스트 결과 객체
   */
  calculateResult(answers: number[], language: SupportedLanguage): TestResult {
    try {
      console.log('BiasCalculator.calculateResult 시작:', {
        answersLength: answers?.length || 0,
        totalQuestions: this.totalQuestions,
        language,
        answersType: typeof answers,
        isArray: Array.isArray(answers)
      });
      
      if (answers && Array.isArray(answers) && answers.length > 0) {
        console.log('답변 샘플:', {
          first5: answers.slice(0, 5),
          last5: answers.slice(-5),
          allDefined: answers.every(a => a !== undefined && a !== null),
          validNumbers: answers.filter(a => typeof a === 'number' && a >= 0 && a <= 3).length
        });
      }
    } catch (logError) {
      console.error('로깅 오류:', logError);
    }

    // 입력 검증 강화
    if (!answers) {
      throw new Error('답변 배열이 null 또는 undefined입니다');
    }
    
    if (!Array.isArray(answers)) {
      console.error('답변 타입 오류:', typeof answers, answers);
      throw new Error(`답변이 배열이 아닙니다: ${typeof answers}`);
    }

    if (answers.length !== this.totalQuestions) {
      console.error('답변 개수 오류:', {
        expected: this.totalQuestions,
        actual: answers.length,
        answers: answers
      });
      throw new Error(`Expected ${this.totalQuestions} answers, got ${answers.length}`);
    }

    // undefined/null 검증
    const invalidAnswers = answers.map((answer, index) => 
      (answer === undefined || answer === null) ? index + 1 : null
    ).filter(x => x !== null);

    if (invalidAnswers.length > 0) {
      throw new Error(`Invalid answers at questions: ${invalidAnswers.join(', ')}`);
    }

    // 점수 범위 검증 (프로필 질문은 더 넓은 범위, 편견 질문은 0-2)
    const invalidScores = answers.map((answer, index) => {
      if (typeof answer !== 'number') return { question: index + 1, score: answer, reason: 'not number' };
      
      // 첫 10개 질문 (프로필): 더 넓은 범위 허용
      if (index < this.profileQuestions) {
        if (answer < 0 || answer > 10) return { question: index + 1, score: answer, reason: 'profile range' };
      } 
      // 나머지 30개 질문 (편견): 0-2 범위
      else {
        if (answer < 0 || answer > 2) return { question: index + 1, score: answer, reason: 'bias range' };
      }
      
      return null;
    }).filter(x => x !== null);

    if (invalidScores.length > 0) {
      throw new Error(`Invalid scores: ${invalidScores.map(s => `Q${s.question}:${s.score} (${s.reason})`).join(', ')}`);
    }

    try {
      // 편견 점수만 계산 (첫 10개 프로필 질문은 제외)
      let totalScore = 0;
      for (let i = this.profileQuestions; i < answers.length; i++) {
        const score = answers[i];
        if (typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 2) {
          totalScore += score;
        } else {
          console.error(`잘못된 편견 점수 값 발견: 질문 ${i + 1}, 점수: ${score}`);
          throw new Error(`Invalid bias score at question ${i + 1}: ${score}`);
        }
      }
      
      const percentage = Math.round((totalScore / this.maxScore) * 100);
      
      console.log('점수 계산 결과:', {
        totalScore,
        maxScore: this.maxScore,
        percentage,
        isValidPercentage: percentage >= 0 && percentage <= 100
      });
      
      if (percentage < 0 || percentage > 100 || isNaN(percentage)) {
        throw new Error(`잘못된 백분율 계산: ${percentage}`);
      }
      
      const biasCategory = getBiasCategory(percentage);
      console.log('편향 카테고리 가져오기 결과:', biasCategory);

      if (!biasCategory) {
        throw new Error(`Failed to determine bias category for percentage: ${percentage}`);
      }
      
      if (!biasCategory.category || !biasCategory.title || !biasCategory.description || !biasCategory.solutions) {
        throw new Error('불완전한 biasCategory 객체');
      }

      const result: TestResult = {
        totalScore,
        percentage,
        category: mapToMainCategory(biasCategory.category),
        solutions: biasCategory.solutions,
        completedAt: new Date().toISOString() // ISO string으로 저장하여 직렬화 문제 해결
      };

      console.log('최종 결과 생성 완료:', {
        totalScore: result.totalScore,
        percentage: result.percentage,
        category: result.category,
        hasSolutions: !!result.solutions,
        completedAt: result.completedAt
      });
      
      return result;

    } catch (error) {
      console.error('BiasCalculator 내부 오류:', error);
      console.error('오류 시점의 answers:', answers);
      throw error;
    }
  }

  /**
   * 현재 진행률을 계산합니다
   * @param currentQuestion 현재 질문 번호 (0-based)
   * @returns 진행률 백분율
   */
  calculateProgress(currentQuestion: number): number {
    return Math.round(((currentQuestion + 1) / this.totalQuestions) * 100);
  }

  /**
   * 편향성 레벨을 텍스트로 반환합니다
   * @param percentage 백분율
   * @param language 언어
   * @returns 레벨 텍스트
   */
  getBiasLevelText(percentage: number, language: SupportedLanguage): string {
    const category = getBiasCategory(percentage);
    return category.title[language];
  }

  /**
   * 편향성 설명을 반환합니다
   * @param percentage 백분율
   * @param language 언어
   * @returns 설명 텍스트
   */
  getBiasDescription(percentage: number, language: SupportedLanguage): string {
    const category = getBiasCategory(percentage);
    return category.description[language];
  }
}

// 싱글톤 인스턴스 생성
export const biasCalculator = new BiasCalculator();