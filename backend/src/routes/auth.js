const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");  // ADD THIS

router.post("/register/request-otp", authController.requestSignupOtp);
router.post("/register/verify", authController.verifySignup);
router.post("/login", authController.login);
router.post("/forgot-password/request-otp", authController.forgotPasswordOtp);
router.post("/forgot-password/reset", authController.resetPassword);
router.get('/me', auth, authController.me);
router.get('/user/:userId', auth, authController.getUserProfile);
router.put('/profile', auth, authController.updateProfile);

// Vault Security
router.post('/vault/verify', auth, authController.verifyVaultAccess);
router.post('/vault/forgot', auth, authController.requestVaultPinOTP);
router.post('/vault/reset', auth, authController.resetVaultPin);

module.exports = router;