"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = exports.resendOTP = exports.verifyOTP = exports.verifyEmail = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const email_1 = require("../services/email");
const sms_1 = require("../services/sms");
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
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
            const emailExists = await User_1.default.findOne({ email });
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
            const phoneExists = await User_1.default.findOne({ phoneNumber });
            if (phoneExists) {
                res.status(400).json({ message: 'User already exists with this phone number' });
                return;
            }
        }
        const verificationToken = email ? crypto_1.default.randomBytes(32).toString('hex') : undefined;
        const otpCode = phoneNumber ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;
        const otpExpires = phoneNumber ? new Date(Date.now() + 10 * 60 * 1000) : undefined;
        const isVerified = false; // Initial unverified state
        const user = await User_1.default.create({
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
                await (0, email_1.sendVerificationEmail)(user.email, verificationToken);
                res.status(201).json({
                    message: 'Registration successful! Please check your email to verify your account.',
                    userId: user._id,
                });
            }
            catch (emailErr) {
                console.error('Error sending verification email:', emailErr);
                res.status(201).json({
                    message: 'Registration successful, but email sending failed. Please contact admin.',
                    userId: user._id,
                });
            }
        }
        else if (phoneNumber && otpCode) {
            // Dispatch Verification SMS Code
            await (0, sms_1.sendSMS)(user.phoneNumber, `Your NexusChat verification code is: ${otpCode}. It is valid for 10 minutes.`);
            res.status(201).json({
                message: 'Registration successful! An OTP code has been sent to your phone number.',
                userId: user._id,
                phoneNumber: user.phoneNumber,
                requiresOtp: true,
            });
        }
        else {
            res.status(201).json({
                message: 'Registration successful! You can now log in.',
                userId: user._id,
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Registration failed', error: error instanceof Error ? error.message : error });
    }
};
exports.register = register;
// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: 'Verification token is required' });
            return;
        }
        const user = await User_1.default.findOne({ verificationToken: token }).select('+verificationToken');
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        const jwtToken = (0, jwt_1.generateToken)(user._id.toString());
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
    }
    catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error instanceof Error ? error.message : error });
    }
};
exports.verifyEmail = verifyEmail;
// @desc    Verify phone number OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { phoneNumber, otpCode } = req.body;
        if (!phoneNumber || !otpCode) {
            res.status(400).json({ message: 'Please provide phone number and OTP code' });
            return;
        }
        const user = await User_1.default.findOne({ phoneNumber }).select('+otpCode +otpExpires');
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
        const token = (0, jwt_1.generateToken)(user._id.toString());
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
    }
    catch (error) {
        res.status(500).json({ message: 'OTP verification failed', error: error instanceof Error ? error.message : error });
    }
};
exports.verifyOTP = verifyOTP;
// @desc    Resend phone verification OTP code
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ message: 'Phone number is required' });
            return;
        }
        const user = await User_1.default.findOne({ phoneNumber });
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
        await (0, sms_1.sendSMS)(user.phoneNumber, `Your NexusChat verification code is: ${newOtp}. It is valid for 10 minutes.`);
        res.status(200).json({
            message: 'A new verification code has been sent to your phone number.',
            phoneNumber: user.phoneNumber,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to resend OTP', error: error instanceof Error ? error.message : error });
    }
};
exports.resendOTP = resendOTP;
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const identifier = email; // email holds the emailOrPhone identifier in this payload
        if (!identifier || !password) {
            res.status(400).json({ message: 'Please provide email or phone number and a password' });
            return;
        }
        const user = await User_1.default.findOne({
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
        const token = (0, jwt_1.generateToken)(user._id.toString());
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
    }
    catch (error) {
        res.status(500).json({ message: 'Login failed', error: error instanceof Error ? error.message : error });
    }
};
exports.login = login;
// @desc    Logout user / clear online status
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        if (req.user) {
            req.user.status = 'offline';
            req.user.lastSeen = new Date();
            await req.user.save();
        }
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Logout failed', error: error instanceof Error ? error.message : error });
    }
};
exports.logout = logout;
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: 'Please provide your email address' });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: 'No account found with this email' });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
        await user.save();
        try {
            await (0, email_1.sendPasswordResetEmail)(user.email, resetToken);
            res.status(200).json({ message: 'Password reset link sent to your email' });
        }
        catch (emailErr) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            console.error('Password reset email error:', emailErr);
            res.status(500).json({ message: 'Failed to send password reset email' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Request failed', error: error instanceof Error ? error.message : error });
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
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
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.default.findOne({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Reset failed', error: error instanceof Error ? error.message : error });
    }
};
exports.resetPassword = resetPassword;
// @desc    Get Authenticated User Details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve profile data' });
    }
};
exports.getMe = getMe;
