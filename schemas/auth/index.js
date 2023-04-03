const Joi = require("joi");

const registerSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string()
    .pattern(/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/)
    .required(),
  subscription: Joi.string().valueOf("starter", "pro", "business"),
});

const loginSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string()
    .pattern(/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/)
    .required(),
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema, verifyEmailSchema };
