export interface PlatformConfig {
  displayName: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const getPlatformConfig = (platform: string): PlatformConfig => {
  const configs: Record<string, PlatformConfig> = {
    prayer: {
      displayName: 'PRAYER',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-500',
      textColor: 'text-white'
    },
    qna: {
      displayName: 'Q&A',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500',
      textColor: 'text-white'
    },
    lecture: {
      displayName: 'LECTURE',
      color: 'bg-green-500',
      bgColor: 'bg-green-500',
      textColor: 'text-white'
    },
    study: {
      displayName: 'STUDY',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-500',
      textColor: 'text-white'
    },
    reading: {
      displayName: 'READING',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-500',
      textColor: 'text-white'
    },
    worship: {
      displayName: 'WORSHIP',
      color: 'bg-pink-500',
      bgColor: 'bg-pink-500',
      textColor: 'text-white'
    },
    livestream: {
      displayName: 'LIVE',
      color: 'bg-red-500',
      bgColor: 'bg-red-500',
      textColor: 'text-white'
    },
    external: {
      displayName: 'EXTERNAL',
      color: 'bg-gray-500',
      bgColor: 'bg-gray-500',
      textColor: 'text-white'
    }
  };

  return configs[platform] || {
    displayName: 'VIDEO',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500',
    textColor: 'text-white'
  };
}; 