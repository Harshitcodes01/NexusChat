import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ParticleNetwork from '../components/ParticleNetwork';
import { Eye, EyeOff, MessageCircle, UserCheck, Lock } from 'lucide-react';

interface LoginForm {
  emailOrPhone: string;
  password: string;
}

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.emailOrPhone, data.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login failed. Please verify credentials.';
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
          className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-amber-500/800 bg-emerald-600/5 rounded-full blur-[130px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 animate-float"
      >
        {/* Header Block */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 15, delay: 0.15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 mb-5 shadow-lg shadow-emerald-500/5 animate-glow"
          >
            <MessageCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-2 bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-sm text-neutral-400 font-medium">Log in to enter your NexusChat space</p>
        </div>

        {/* Card Frame */}
        <div className="glass-card rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Email or Phone Input */}
            <div className="space-y-2">
              <label htmlFor="emailOrPhone" className="block text-xs font-bold text-neutral-300 uppercase tracking-widest">
                Email or Phone Number
              </label>
              <div className="relative">
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="emailOrPhone"
                  type="text"
                  placeholder="email@example.com or +1234567890"
                  className="w-full pl-12 pr-4 py-3.5 glass-input rounded-2xl text-white placeholder-neutral-500 text-sm focus:outline-none"
                  {...register('emailOrPhone', {
                    required: 'Email or Phone Number is required',
                    validate: (value) => {
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                      if (emailRegex.test(value) || phoneRegex.test(value)) {
                        return true;
                      }
                      return 'Please enter a valid email or phone number (e.g. +1234567890)';
                    },
                  })}
                />
              </div>
              {errors.emailOrPhone && (
                <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.emailOrPhone.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold text-neutral-300 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 glass-input rounded-2xl text-white placeholder-neutral-500 text-sm focus:outline-none"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Action */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)' }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 text-sm mt-8"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Footer Navigation */}
          <p className="text-center text-neutral-400 text-sm mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
              Sign Up Free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Internal loader helper
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default LoginPage;
