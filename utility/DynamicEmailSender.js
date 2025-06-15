 const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
dotenv.config();
const fs = require("fs");
const {APP_PASSWORD} = process.env

async function updateTemplateHelper(templatePath, toReplaceObject) {
    let templateContent =  await fs.promises.readFile(templatePath, "utf-8");

    const keyArrs =Object.keys(toReplaceObject);
    keyArrs.forEach((key)=>{
        templateContent = templateContent.replace(`{${key}}`, toReplaceObject[key]);
    })
    return templateContent;
}
async function emailSender(templatePath, receiverEmail, toReplaceObject) {
    try {
        const content = await updateTemplateHelper(templatePath, toReplaceObject);
        // through which service you have to send the mail
        const sendGridDetails = {
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: "s.p.chandrasai820@gmail.com",
                pass: APP_PASSWORD
            }
        };

        const msg = {
            to: receiverEmail,
            from: "s.p.chandrasai820@gmail.com", // Change to your verified sender
            subject: "Sending First Email",
            text: "and easy to do anywhere, even with Node.js",
            html: content
        };

        const transporter = nodemailer.createTransport(sendGridDetails);
        await transporter.sendMail(msg)
    }
    catch (err) {
        console.log("Email not sent due to an error", err);
    }
}

// Demo
// const toReplaceObject = {
//     name: "Sai",
//     otp: "1234",
// }

// emailSender("./templates/otp.html", "s.p.chandrasai820@gmail.com", toReplaceObject).then(()=>{
//     console.log("Email is sent");
// })
module.exports=emailSender;
