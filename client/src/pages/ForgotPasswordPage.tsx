import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import ParticleNetwork from '../components/ParticleNetwork';
import { MessageCircle, Mail, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
      toast.success('Password reset link sent!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to send reset link.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-4 relative overflow-hidden text-neutral-100 animate-theme-fade">
      
      {/* Mesh Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Particle Network Canvas */}
      <ParticleNetwork />

      {/* Floating Orbital Glow Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-20 -right-20 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-emerald-600/5 rounded-full blur-[130px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 animate-float"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4"
          >
            <MessageCircle className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">Forgot Password</h1>
          <p className="text-neutral-400">We'll send you a reset link</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Check your email</h3>
              <p className="text-neutral-400 text-sm">
                We've sent a password reset link to your email. Please check your inbox (and spam folder).
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm mt-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email',
                      },
                    })}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </motion.button>

              <p className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-300 text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
