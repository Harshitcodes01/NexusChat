import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { sendSMS } from '../services/sms';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    if (!name || !password || (!email && !phoneNumber)) {
      res.status(400).json({ message: 'Please provide name, password, and either email or phone number' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ message: 'Please provide a valid email address' });
        return;
      }

      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({ message: 'User already exists with this email' });
        return;
      }
    }

    if (phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        res.status(400).json({ message: 'Please provide a valid phone number (e.g., +1234567890)' });
        return;
      }

      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        res.status(400).json({ message: 'User already exists with this phone number' });
        return;
      }
    }

    const verificationToken = email ? crypto.randomBytes(32).toString('hex') : undefined;
    const otpCode = phoneNumber ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;
    const otpExpires = phoneNumber ? new Date(Date.now() + 10 * 60 * 1000) : undefined;
    const isVerified = false; // Initial unverified state

    const user = await User.create({
      name,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      password,
      verificationToken,
      otpCode,
      otpExpires,
      isVerified,
    });

    if (email && verificationToken) {
      try {
        await sendVerificationEmail(user.email!, verificationToken);
        res.status(201).json({
          message: 'Registration successful! Please check your email to verify your account.',
          userId: user._id,
        });
      } catch (emailErr) {
        console.error('Error sending verification email:', emailErr);
        res.status(201).json({
          message: 'Registration successful, but email sending failed. Please contact admin.',
          userId: user._id,
        });
      }
    } else if (phoneNumber && otpCode) {
      // Dispatch Verification SMS Code
      await sendSMS(
        user.phoneNumber!,
        `Your NexusChat verification code is: ${otpCode}. It is valid for 10 minutes.`
      );

      res.status(201).json({
        message: 'Registration successful! An OTP code has been sent to your phone number.',
        userId: user._id,
        phoneNumber: user.phoneNumber,
        requiresOtp: true,
      });
    } else {
      res.status(201).json({
        message: 'Registration successful! You can now log in.',
        userId: user._id,
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired verification token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    const jwtToken = generateToken(user._id.toString());

    res.status(200).json({
      message: 'Email verified successfully!',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Verify phone number OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      res.status(400).json({ message: 'Please provide phone number and OTP code' });
      return;
    }

    const user = await User.findOne({ phoneNumber }).select('+otpCode +otpExpires');
    if (!user) {
      res.status(404).json({ message: 'No user account found with this phone number' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'This phone number has already been verified' });
      return;
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      res.status(400).json({ message: 'Invalid OTP code entered' });
      return;
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      res.status(400).json({ message: 'This OTP code has expired. Please request a new one.' });
      return;
    }

    // Success! Verify user
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      message: 'Phone number verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Resend phone verification OTP code
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({ message: 'Phone number is required' });
      return;
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      res.status(404).json({ message: 'No user account found with this phone number' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'This phone number has already been verified' });
      return;
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = newOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send SMS
    await sendSMS(
      user.phoneNumber!,
      `Your NexusChat verification code is: ${newOtp}. It is valid for 10 minutes.`
    );

    res.status(200).json({
      message: 'A new verification code has been sent to your phone number.',
      phoneNumber: user.phoneNumber,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const identifier = email; // email holds the emailOrPhone identifier in this payload

    if (!identifier || !password) {
      res.status(400).json({ message: 'Please provide email or phone number and a password' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phoneNumber: identifier }
      ]
    }).select('+password');

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Please verify your email before logging in' });
      return;
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Logout user / clear online status
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      req.user.status = 'offline';
      req.user.lastSeen = new Date();
      await req.user.save();
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Please provide your email address' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'No account found with this email' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    await user.save();

    try {
      await sendPasswordResetEmail(user.email!, resetToken);
      res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error('Password reset email error:', emailErr);
      res.status(500).json({ message: 'Failed to send password reset email' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Request failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset token' });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Get Authenticated User Details
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        bio: req.user.bio,
        status: req.user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve profile data' });
  }
};
