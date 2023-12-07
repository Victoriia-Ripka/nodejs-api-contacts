const { User } = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const fs = require("fs/promises");
const path = require("path");
const Jimp = require("jimp");
const { nanoid } = require("nanoid");
const { ctrlWrapper, HttpError, sendEmail } = require("../helpers");
require("dotenv").config();

const { SECRET_KEY, BASE_URL } = process.env;

const createVarifyEmail = (email, verificationToken) => {
  return {
    to: email,
    subject: "Contacts App. Verify email",
    html: `<h2>Thank you for registration</h2><a targt="_blank" href="${BASE_URL}/api/users/verify/${verificationToken}">Please, confirm your email.</a><p>Have a nice day</p>`,
  };
};

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    res.status(409);
    throw HttpError(409, "Email in use");
  }

  const payload = {
    email
  };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "24h" });

  const verifyEmail = createVarifyEmail(email, token);
  await sendEmail(verifyEmail);

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    verificationToken: token,
    avatarURL,
    verify: true,
  });

  res.status(201).json({ user: newUser });
};

// const verify = async (req, res) => {
//   const { verificationToken } = req.params;

//   if (!verificationToken) {
//     throw HttpError(404);
//   }

//   const user = await User.findOne({ verificationToken, verify: false });

//   if (!user) {
//     throw HttpError(404);
//   }

//   await User.findByIdAndUpdate(user._id, {
//     verify: true,
//     verificationToken: "",
//   });

//   res.status(200).json({
//     message: "Verification successful",
//   });
// };

// const verifyNewly = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     throw HttpError(400, "missing required field email");
//   }

//   const user = await User.findOne({ email });

//   if (user.verify) {
//     return res.status(400).json({
//       message: "Verification has already been passed",
//     });
//   }

//   const verifyEmail = createVarifyEmail(email, user.verificationToken);
//   await sendEmail(verifyEmail);

//   await User.findByIdAndUpdate(user._id, {
//     verify: true,
//     verificationToken: "",
//   });

//   res.status(200).json({
//     message: "Verification email sent",
//   });
// };

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, verify: true });
  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!user || !passwordCompare) {
    throw HttpError(401, "Email or password is wrong");
  }

  if (!user.verify) {
    throw HttpError(401, "Email doesn't verifed");
  }

  const payload = {
    email
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "24h" });
  await User.findByIdAndUpdate(user._id, { token });
  res.status(200).json({
    user,
    token,
  });
};

const logout = async (req, res) => {
  const { email } = req.body; 

  const user = await User.findOneAndUpdate({ email }, { token: "" });
  if (!user) { 
    HttpError(404)
  }

  res.status(204).end();
};

const current = async (req, res) => {
  const user = req.user
  res.status(200).json({...user});
};

const updateSubscriptionType = async (req, res) => {
  const { _id: owner } = req.user;
  const { email, subscription } = req.body;

  if (
    subscription === "starter" ||
    subscription === "pro" ||
    subscription === "business"
  ) {
    await User.findByIdAndUpdate({ _id: owner }, { subscription });
    res.status(200).json({
      email,
      subscription,
    });
  }

  throw HttpError(400);
};

const avatarDir = path.join(__dirname, "../", "public", "avatars");

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: tempUpload, filename } = req.file;
  const newFileName = `${_id}_${filename}`;

  await Jimp.read(tempUpload)
    .then((image) => {
      image.resize(250, 250);
      image.write(path.join("temp", filename));
    })
    .catch((err) => console.log(err));

  const resultUpload = path.join(avatarDir, newFileName);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", newFileName);

  await User.findByIdAndUpdate(_id, { avatarURL });
  res.status(200).json({ avatarURL });
};

const passwordRecovery = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, verify: true });

  if (!user) {
    throw HttpError(404);
  }

  const newPassword = nanoid();
  const hashPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate({ _id: user._id }, { password: hashPassword });

  const emailPassword = {
    to: email,
    subject: "Contacts App. Password recovery",
    text: `Here is your temperary password: ${newPassword}`,
    html: `<p>Here is your temperary password: ${newPassword}</p>`,
  };
  await sendEmail(emailPassword);

  res.status(200).json({
    message: "password updated successfuly",
  });
};

module.exports = {
  register: ctrlWrapper(register),
  // verify: ctrlWrapper(verify),
  // verifyNewly: ctrlWrapper(verifyNewly),
  login: ctrlWrapper(login),
  logout: ctrlWrapper(logout),
  current: ctrlWrapper(current),
  updateSubscriptionType: ctrlWrapper(updateSubscriptionType),
  updateAvatar: ctrlWrapper(updateAvatar),
  passwordRecovery: ctrlWrapper(passwordRecovery),
};
