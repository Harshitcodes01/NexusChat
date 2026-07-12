import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { MessageCircle, Key, ArrowLeft, Loader2 } from 'lucide-react';

interface OTPForm {
  otpCode: string;
}

const VerifyOTPPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOtpAndLogin } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const phone = searchParams.get('phone');
    if (!phone) {
      toast.error('No phone number provided. Redirecting to registration.');
      navigate('/register');
      return;
    }
    setPhoneNumber(phone);
  }, [searchParams, navigate]);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPForm>();

  const onSubmit = async (data: OTPForm) => {
    setIsSubmitting(true);
    try {
      await verifyOtpAndLogin(phoneNumber, data.otpCode);
      toast.success('Phone verified successfully!');
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid or expired OTP code.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.resendOTP(phoneNumber);
      toast.success('Verification code resent successfully!');
      setTimer(60); // Reset timer
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to resend code.';
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-neutral-100">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4"
          >
            <MessageCircle className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">Verify Code</h1>
          <p className="text-neutral-400">Sent verification SMS code to</p>
          <p className="text-emerald-400 font-semibold mt-1">{phoneNumber}</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-zinc-800 p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="otpCode" className="block text-sm font-semibold text-neutral-300 mb-2">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-950/40 border border-zinc-800 rounded-2xl text-white placeholder-neutral-500 text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-lg"
                  {...register('otpCode', {
                    required: 'Verification code is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Please enter a valid 6-digit code',
                    },
                  })}
                />
              </div>
              {errors.otpCode && (
                <p className="text-red-400 text-xs mt-1.5">{errors.otpCode.message}</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Verify & Log In'
              )}
            </motion.button>
          </form>

          {/* Resend actions block */}
          <div className="text-center text-sm">
            <span className="text-neutral-400">Didn't receive the code? </span>
            {timer > 0 ? (
              <span className="text-emerald-500 font-semibold">Resend in {timer}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <p className="text-center">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Register
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTPPage;
