const express = require("express");
const ctrl = require("../../controllers/auth");
const { validateBody, authenticate, upload } = require("../../middlewares");
const { schemas } = require("../../models/user");

const router = express.Router();

router.post("/register", validateBody(schemas.registerSchema), ctrl.register);
router.post("/login", validateBody(schemas.loginSchema), ctrl.login);
// router.get("/verify/:verificationToken", ctrl.verify);
// router.post("/verify", ctrl.verifyNewly);
router.post("/logout", ctrl.logout); //, authenticate
router.get("/current", authenticate, ctrl.current); 
// router.post("/password_recovery", ctrl.passwordRecovery);
// router.patch("/", authenticate, ctrl.updateSubscriptionType)
router.patch("/avatars", authenticate, upload.single("avatar"), ctrl.updateAvatar)

module.exports = router;
