"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
const models_1 = require("../models");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await models_1.User.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ message: 'User no longer exists' });
            return;
        }
        if (!user.isVerified) {
            res.status(403).json({ message: 'Please verify your email to access this resource' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, invalid token' });
    }
};
exports.protect = protect;
