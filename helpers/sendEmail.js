const nodemailer = require("nodemailer");
require("dotenv").config();
const { APP_EMAIL, METTA_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.meta.ua",
  port: 465,
  secure: true,
  auth: {
    user: APP_EMAIL,
    pass: METTA_PASSWORD,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);


const sendEmail = async (data) => {
  const email = { ...data, from: APP_EMAIL };
  transport
    .sendMail(email)
    .then(() => console.log("Email send successful"))
    .catch((err) => console.log(err.message));
  return true;
};

module.exports = sendEmail;
