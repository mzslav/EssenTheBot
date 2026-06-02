import { useEffect, useState } from 'react';
import type { TelegramUser } from '../types/types';
import supabase from '../supabase/supabase-client';
import { useFadeIn } from '../utils/useFadeIn';
import { Star, Rocket, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
  onStart: () => void;
}

export const WelcomeScreen = ({ user, isDark, themeColor = '#8b5cf6', onStart }: WelcomeScreenProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  const firstName = user?.first_name || 'User';
  const isPremium = user?.is_premium || false;
  const avatarSrc = user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=${themeColor.slice(1)}&color=fff&size=128`;

  const fadeIn = useFadeIn(!isLoading);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user?.id) { setIsLoading(false); return; }
      try {
        const { data } = await supabase
          .from('users')
          .select('telegram_user_id, weight, height, age')
          .eq('telegram_user_id', user.id)
          .maybeSingle();
        if (data?.weight && data?.height && data?.age) setIsRegistered(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    checkUserStatus();
  }, [user]);

  return (
    <div className="relative z-10 w-full max-w-md">
      <div
        style={fadeIn.style(0)}
        className={`${isDark ? 'bg-white/5' : 'bg-white/80'} backdrop-blur-2xl rounded-2xl p-6 border ${isDark ? 'border-white/10' : 'border-purple-200'} shadow-xl`}
      >
        <div style={fadeIn.style(1)} className="flex justify-center mb-6">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full shadow-md flex items-center justify-center overflow-hidden"
              style={{ backgroundImage: `url(${avatarSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {!user?.photo_url && (
                <span className="text-white text-2xl font-bold">{firstName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isPremium && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Star size={12} className="text-white fill-yellow-400" />
              </div>
            )}
          </div>
        </div>

        <div style={fadeIn.style(2)} className="text-center">
          <span className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-1 block`}>{t('welcome.greeting')}</span>
          <h2 className="text-3xl font-black tracking-tight break-words leading-tight pb-1" style={{ color: themeColor }}>
            {firstName}!
          </h2>
          {user?.username && (
            <div className={`mt-2 inline-flex px-3 py-0.5 rounded-full ${isDark ? 'bg-white/5 border border-white/10' : 'bg-purple-50 border border-purple-100'}`}>
              <p className="text-xs font-medium" style={{ color: themeColor, opacity: 0.8 }}>@{user.username}</p>
            </div>
          )}
        </div>

        <div style={fadeIn.style(3)} className="mt-6 mb-5 flex justify-center">
          <div className="w-12 h-0.5 rounded-full opacity-40" style={{ background: themeColor }} />
        </div>

        <p style={fadeIn.style(4)} className={`text-center ${isDark ? 'text-white/70' : 'text-slate-700'} text-sm leading-relaxed flex items-center justify-center gap-1.5`}>
          {isRegistered ? t('welcome.account_found') : <>{t('welcome.glad_to_see')} <Rocket size={16} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} /></>}
        </p>

        <div style={fadeIn.style(5)} className="mt-6">
          {isRegistered ? (
            <div className={`w-full py-3 px-5 rounded-xl border flex items-center justify-center gap-2 ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-600'}`}>
              <CheckCircle2 size={18} />
              <span className="font-semibold">{t('welcome.already_registered')}</span>
            </div>
          ) : (
            <button
              onClick={onStart}
              className="w-full text-white font-semibold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}
            >
              {t('welcome.start')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};