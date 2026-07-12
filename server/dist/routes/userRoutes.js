"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.protect, userController_1.getUsers);
router.put('/profile', auth_1.protect, userController_1.updateProfile);
exports.default = router;
