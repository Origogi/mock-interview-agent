/**
 * Debug mode sample resume fixture
 * Schema matches App.jsx's setSummaryData structure
 */
export const FIXTURE_SAMPLE_RESUME = {
  name: '김준영',
  bio: '3년 경력의 풀스택 엔지니어. React와 Python으로 B2B 주문 관리 시스템 구축 경험.',
  workExperience: [
    {
      period: '2022-2025',
      company: 'TechStart Inc.',
      role: 'Senior Frontend Engineer',
    },
    {
      period: '2021-2022',
      company: 'DataFlow Solutions',
      role: 'Full Stack Developer',
    },
    {
      period: '2020-2021',
      company: 'StartUp Lab',
      role: 'Junior Developer',
    },
  ],
  techStack: [
    'React',
    'TypeScript',
    'Node.js',
    'Python',
    'FastAPI',
    'PostgreSQL',
    'Redis',
    'Docker',
  ],
  projects: [
    {
      name: '주문 관리 시스템',
      description: '대량 주문 처리를 위한 B2B 플랫폼. 실시간 주문 추적 및 분석 대시보드 구현.',
      technologies: ['React', 'FastAPI', 'PostgreSQL'],
    },
    {
      name: 'API 마이크로서비스 마이그레이션',
      description: '모놀리식 시스템을 마이크로서비스 아키텍처로 전환. 성능 30% 향상.',
      technologies: ['Node.js', 'Docker', 'Kubernetes'],
    },
  ],
  strengths: [
    '프론트엔드-백엔드 양쪽 경험으로 빠른 문제 해결',
    '대규모 트래픽 환경에서의 성능 최적화 경험',
    '팀 협업 및 코드 리뷰 문화 주도',
  ],
  weakPoints: [
    '모바일 개발 경험 부족',
    'DevOps 인프라 설계 경험 부재',
    '데이터베이스 튜닝 깊이 있는 이해 필요',
  ],
};
