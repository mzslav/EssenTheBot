import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
  isDark?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-xl',
  isDark = true,
}) => (
  <>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .skeleton-shimmer {
        background-size: 800px 100%;
        animation: shimmer 1.6s ease-in-out infinite;
      }
    `}</style>
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={{
        width,
        height,
        backgroundImage: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.09) 50%, rgba(0,0,0,0.05) 75%)',
      }}
    />
  </>
);

export const MainScreenSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {

  return (
    <div className="w-full max-w-md pb-8 space-y-5 px-2">
      <div className="flex justify-between items-center px-1 pt-2">
        <div className="space-y-2">
          <Skeleton isDark={isDark} width={160} height={24} rounded="rounded-lg" />
          <Skeleton isDark={isDark} width={100} height={14} rounded="rounded-md" />
        </div>
        <Skeleton isDark={isDark} width={10} height={10} rounded="rounded-full" />
      </div>

      <Skeleton isDark={isDark} height={52} rounded="rounded-2xl" className="w-full" />

      <Skeleton isDark={isDark} height={160} rounded="rounded-3xl" className="w-full" />

      <Skeleton isDark={isDark} height={120} rounded="rounded-2xl" className="w-full" />

      <Skeleton isDark={isDark} height={72} rounded="rounded-2xl" className="w-full" />
      <Skeleton isDark={isDark} height={72} rounded="rounded-2xl" className="w-full" />
    </div>
  );
};

export const FridgeScreenSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="w-full max-w-md space-y-4 px-2">
    <Skeleton isDark={isDark} height={48} rounded="rounded-2xl" className="w-full" />
    <Skeleton isDark={isDark} height={64} rounded="rounded-2xl" className="w-full" />
    {[1, 2, 3, 4].map(i => (
      <Skeleton key={i} isDark={isDark} height={70} rounded="rounded-2xl" className="w-full" />
    ))}
  </div>
);

export const WorkoutScreenSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="w-full max-w-md space-y-4 px-2">
    <Skeleton isDark={isDark} height={44} rounded="rounded-2xl" className="w-full" />
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} isDark={isDark} height={110} rounded="rounded-2xl" className="w-full" />
      ))}
    </div>
    <Skeleton isDark={isDark} height={80} rounded="rounded-2xl" className="w-full" />
  </div>
);

export const ProfileScreenSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="w-full max-w-md space-y-4 px-2">
    <div className="flex flex-col items-center gap-3 pb-2">
      <Skeleton isDark={isDark} width={96} height={96} rounded="rounded-full" />
      <Skeleton isDark={isDark} width={140} height={24} rounded="rounded-lg" />
      <Skeleton isDark={isDark} width={100} height={14} rounded="rounded-md" />
    </div>
    <Skeleton isDark={isDark} height={52} rounded="rounded-2xl" className="w-full" />
    <div className="flex gap-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} isDark={isDark} height={80} rounded="rounded-2xl" className="flex-1" />
      ))}
    </div>
    <Skeleton isDark={isDark} height={160} rounded="rounded-2xl" className="w-full" />
    <Skeleton isDark={isDark} height={130} rounded="rounded-2xl" className="w-full" />
    <Skeleton isDark={isDark} height={56} rounded="rounded-2xl" className="w-full" />
  </div>
);

export const JournalTabSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="space-y-3">
    <Skeleton isDark={isDark} height={140} rounded="rounded-2xl" className="w-full" />
    <Skeleton isDark={isDark} height={28} rounded="rounded-xl" className="w-full" />
    <Skeleton isDark={isDark} height={160} rounded="rounded-2xl" className="w-full" />
  </div>
);

export const PlansTabSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="space-y-3">
    <Skeleton isDark={isDark} height={44} rounded="rounded-2xl" className="w-full" />
    {[1, 2, 3].map(i => (
      <Skeleton key={i} isDark={isDark} height={80} rounded="rounded-2xl" className="w-full" />
    ))}
  </div>
);

export const ProgressTabSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="space-y-3">
    <Skeleton isDark={isDark} height={44} rounded="rounded-xl" className="w-full" />
    <Skeleton isDark={isDark} height={44} rounded="rounded-xl" className="w-full" />
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} isDark={isDark} height={64} rounded="rounded-2xl" className="w-full" />
      ))}
    </div>
    <Skeleton isDark={isDark} height={200} rounded="rounded-2xl" className="w-full" />
  </div>
);