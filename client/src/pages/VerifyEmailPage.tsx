import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import ParticleNetwork from '../components/ParticleNetwork';
import { CheckCircle, XCircle, Loader, MessageCircle } from 'lucide-react';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    const verify = async () => {
      try {
        const res = await authService.verifyEmail(token);
        if (res.data.token) {
          localStorage.setItem('nexuschat_token', res.data.token);
          localStorage.setItem('nexuschat_user', JSON.stringify(res.data.user));
        }
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        toast.success('Email verified!');
        setTimeout(() => navigate('/'), 2500);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
        toast.error('Verification failed');
      }
    };

    verify();
  }, [searchParams, navigate]);

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
        className="w-full max-w-md text-center relative z-10 animate-float"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-6 relative animate-glow">
          <MessageCircle className="w-8 h-8 text-emerald-400" />
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-8 shadow-2xl relative">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
              <h2 className="text-xl font-semibold text-white">Verifying your email...</h2>
              <p className="text-neutral-400">Please wait a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Email Verified!</h2>
              <p className="text-neutral-400">{message}</p>
              <p className="text-neutral-500 text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Verification Failed</h2>
              <p className="text-neutral-400">{message}</p>
              <Link
                to="/login"
                className="inline-block mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
