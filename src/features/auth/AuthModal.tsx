import { useEffect, useRef, useState } from 'react';
import { Mail, ChevronLeft, KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/toast/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Колбэк после успешного логина */
  onSignedIn?: () => void;
}

const RESEND_SECONDS = 60;

export function AuthModal({ open, onClose, onSignedIn }: Props) {
  const toast = useToast();
  const { signInWithOtp, verifyOtp, loading } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  // reset on open
  useEffect(() => {
    if (!open) return;
    setStep('email');
    setCode('');
    setEmailError(null);
    setCodeError(null);
  }, [open]);

  // cooldown tick
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) {
        window.clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
      return;
    }
    if (!cooldownRef.current) {
      cooldownRef.current = window.setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) {
        window.clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [cooldown]);

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function sendCode() {
    setEmailError(null);
    if (!validateEmail(email)) {
      setEmailError('Некорректный email');
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error('Supabase не настроен — пропиши .env.local');
      return;
    }
    try {
      await signInWithOtp(email);
      toast.success('Код отправлен на почту');
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить код';
      toast.error(msg);
    }
  }

  async function confirmCode() {
    setCodeError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError('Введите 6-значный код');
      return;
    }
    try {
      const ok = await verifyOtp(email, trimmed);
      if (ok) {
        toast.success('Вы вошли');
        onSignedIn?.();
        onClose();
      } else {
        setCodeError('Не удалось подтвердить код');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неверный или просроченный код';
      setCodeError(msg);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'email' ? 'Вход в LMERC' : 'Введите код'}
      size="sm"
      footer={
        step === 'email' ? (
          <>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button
              icon={<Mail size={16} />}
              onClick={sendCode}
              loading={loading}
            >
              Отправить код
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              icon={<ChevronLeft size={16} />}
              onClick={() => setStep('email')}
              disabled={loading}
            >
              Назад
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button
              icon={<KeyRound size={16} />}
              onClick={confirmCode}
              loading={loading}
            >
              Войти
            </Button>
          </>
        )
      }
    >
      {step === 'email' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            Введите email — мы пришлём 6-значный код для входа. Пароль не нужен.
          </p>
          <Input
            label="Email"
            type="email"
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendCode();
            }}
            placeholder="you@example.com"
            error={emailError ?? undefined}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            Код отправлен на{' '}
            <span className="font-bold text-text-primary">{email}</span>. Введите его
            ниже. Письмо может прийти в спам.
          </p>
          <Input
            label="Код из письма"
            inputMode="numeric"
            autoFocus
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmCode();
            }}
            placeholder="123456"
            error={codeError ?? undefined}
            className="text-2xl tabular tracking-widest text-center"
          />
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={() => void sendCode()}
            className="text-xs uppercase tracking-badge text-text-secondary hover:text-lime-primary disabled:opacity-50 disabled:hover:text-text-secondary transition self-start"
          >
            {cooldown > 0
              ? `Отправить ещё раз через ${cooldown}с`
              : 'Отправить код повторно'}
          </button>
        </div>
      )}
    </Modal>
  );
}
