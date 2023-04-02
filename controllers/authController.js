const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");
const gravatar = require("gravatar");
const { v4: uuidv4 } = require("uuid");

const { RequestError, sendEmail } = require("../helpers");
const User = require("../models/user");
const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const { TOKEN_KEY } = process.env;

const register = async (req, res, next) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw RequestError(409`Email: ${email} already in use`);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email, { protocol: "https", s: "100" });
  const verificationToken = uuidv4();

  const user = await User.create({
    email,
    password: hashedPassword,
    avatarURL,
    verificationToken,
  });
  const letter = {
    to: email,
    subject: "Registration Confirmation",
    html: `<a href="http://localhost:3000/api/auth/verify/${verificationToken}" target="_blank">Please follow the link to complete your registration</a>`,
  };
  await sendEmail(letter);
  res.status(201).json({
    email: user.email,
    subscription: user.subscription,
    avatarURL,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid || !existingUser) {
    throw RequestError(401, "Email or password is wrong");
  }
  const payload = {
    id: existingUser._id,
  };
  const token = jwt.sign(payload, TOKEN_KEY, { expiresIn: "1h" });
  await User.findByIdAndUpdate(existingUser._id, { token });
  res.json({ token });
};

const logout = async (req, res, next) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.status(204).json({
    message: "No Content",
  });
};

const current = async (req, res, next) => {
  const { email } = req.user;
  const user = await User.findOne({ email });
  res.status(200).json({
    email: user.email,
    subscription: user.subscription,
  });
};

const avatars = async (req, res, next) => {
  try {
    const { _id: id } = req.user;
    const { path: tempDir, originalname } = req.file;
    const [extention] = originalname.split(".").reverse();
    const avatarName = `${id}.${extention}`;
    const resultUpload = path.join(avatarsDir, avatarName);
    const image = await Jimp.read(`./temp/${originalname}`);
    await image.resize(250, 250);
    await image.writeAsync(`./temp/${originalname}`);
    await fs.rename(tempDir, resultUpload);
    const avatarURL = path.join("public", "avatars", avatarName);
    await User.findByIdAndUpdate(id, { avatarURL });
    res.status(201).json(avatarURL);
  } catch (error) {
    await fs.unlink(req.file.path);
    next(error);
  }
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw new Error(404, "Error! No such user!");
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: "",
  });
  res.json({ messsage: "Email verification completed" });
};

const resendVerification = async (req, res) => {
  console.log("resend works");
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(404, "Error! No such user!");
  }
  if (user.verify) {
    throw new Error(400, "Error! User is already verified!");
  }

  const letter = {
    to: email,
    subject: "Registration Confirmation",
    html: `<a href="http://localhost:3000/api/auth/verify/${user.verificationToken}" target="_blank">Please follow the link to complete your registration</a>`,
  };
  await sendEmail(letter);
  res.json({ messsage: "Email verification letter has been resent" });
};

module.exports = {
  register,
  login,
  logout,
  current,
  avatars,
  verifyEmail,
  resendVerification,
};
