const UserModel = require("../model/UserModel");
const emailSender = require("../utility/DynamicEmailSender");
const jwt = require("jsonwebtoken");
const promisify = require("util").promisify;
const promisifiedJWTSign = promisify(jwt.sign);
const promisifiedJWTVerify = promisify(jwt.verify);
const { JWT_SECRET_KEY } = process.env;

async function forgetPasswordHandler(req, res) {
    try {
        /**
         * 1. user send the email : extract email
         * 2. check if email is present in DB (user)
         *      *if email is not present -> send a response to the user (user not found)
         *      *if email is present ->
         * 3. create basic otp ->
         *      *map the otp to the user
         *      *sent to the email
         * 4. url -> reset url -> id
        */
        // step 1
        if (req.body.email == undefined) {
            return res.status(401).json({
                status: "failure",
                message: "Please enter the email for forget Password"
            })
        }
        // step 2
        const user = await UserModel.findOne({ email: req.body.email });
        if (user == null) {
            return res.status(404).json({
                status: "failure",
                message: "user not found for this email"
            })
        }
        // step 3
        const otp = otpGenerator();
        user.otp = otp;
        user.otpExpire = Date.now() + 1000 * 60 * 10; //10 min

        await user.save({ validateBeforeSave: false });

        // email send
        // email -> req.body.email
        // otp -> add 
        res.status(200).json({
            message: "otp sent successfully",
            status: "success",
            otp: otp,
            resetURL: `http:localhost:3000/api/auth/resetPassword/${user["_id"]}`
        })
        const templateData = { name: user.name, otp: user.otp }
        await emailSender("./templates/otp.html", user.email, templateData);
    }
    catch (err) {
        console.log("err", err);
        res.status(500).json({
            message: err.message,
            status: "failure"
        })
    }
}

async function resetPasswordHandler(req, res) {
    try {
        let resetDetails = req.body;
        // to check if required fields are there or not
        if (!resetDetails.password || !resetDetails.confirmPassword || !resetDetails.otp || resetDetails.password != resetDetails.confirmPassword) {
            return res.status(401).json({
                status: "failure",
                message: "invalid request"
            })
        }
        // const userId = req.params.userId;
        // const user = await UserModel.findById(userId);
        const user = await UserModel.findOne({ email: req.body.email });
        // if user is not present
        if (user == null) {
            return res.status(404).json({
                status: "failure",
                message: "user not found"
            })
        }
        // if otp is not present in db user
        if (user.otp == undefined) {
            return res.status(401).json({
                status: "failure",
                message: "unauthorized access to reset the Password"
            })
        }
        // if otp is expired
        if (Date.now() > user.otpExpire) {
            return res.status(401).json({
                status: "failure",
                message: "otp expired"
            })
        }
        // if otp is incorrect
        if (user.otp != resetDetails.otp) {
            return res.status(401).json({
                status: "failure",
                message: "otp is incorrect"
            })
        }

        user.password = resetDetails.password;
        user.confirmPassword = resetDetails.confirmPassword;
        // console.log("225", user);
        // remove the otp from the user
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        res.status(200).json({
            status: "success",
            message: "password reset successfully"
        })
    }
    catch (err) {
        console.log("err", err);
        res.status(500).json({
            message: err.message,
            status: "failure"
        })
    }
}

async function signupHandler(req, res) {
    try {
        const userObject = req.body;
        //1. email -> data get -> check email -> password
        if (!userObject.email || !userObject.password) {
            return res.status(400).json({
                "message": "required data missing",
                status: "failure"
            })
        }
        //2. check email -> if exists -> already loggedIn
        const user = await UserModel.findOne({ email: userObject.email });
        if (user) {
            return res.status(400).json({
                "message": "user is already signed up",
                status: "failure"
            })
        }

        const newUser = await UserModel.create(userObject);
        //hash the new password
        //send a response
        res.status(201).json({
            "message": "user signup successfully",
            user: newUser,
            status: "success"
        })
    }
    // user Email -> verification of there Email Id 
    // welcome Email
    catch (err) {
        console.log("err", err);
        res.status(500).json({
            message: err.message,
            status: "failure"
        })
    }
}

async function loginHandler(req, res) {
    // email, password -> if exist -> allow login 
    // cookies -> JWT -> they will bring back the token -> protected Route
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "Invalid email or password",
                status: "failure"
            })
        }
        // hash the password
        const areEqual = password == user.password;
        if (!areEqual) {
            return res.status(400).json({
                message: "Invalid email or password",
                status: "failure"
            })
        }

        //token create
        const authToken = await promisifiedJWTSign({ id: user["_id"] }, process.env.JWT_SECRET_KEY);
        //token -> cookies
        res.cookie("jwt", authToken, {
            maxAge: 1000 * 60 * 60 * 24,
            secure: true, //it will only work on https
            httpOnly: true //it can be only accessed by the server
        })
        //res send
        res.status(200).json({
            message: "login successfully",
            status: "success",
            user: user
        })
    }
    catch (err) {
        console.log("err", err);
        res.status(500).json({
            message: err.message,
            status: "failure"
        })
    }
}

const otpGenerator = function () {
    return Math.floor(100000 + Math.random() * 900000);
}

const protectRouteMiddleWare = async function (req, res, next) {
    try {
        let jwttoken = req.cookies.jwt;
        if (!jwttoken) throw new Error("UnAuthorized!");
        let decryptedToken = await promisifiedJWTVerify(jwttoken, JWT_SECRET_KEY);
        if (decryptedToken) {
            let userId = decryptedToken.id;
            // adding the userId to the req object
            req.userId = userId;
            console.log("authenticated");
            next();
        }
    }
    catch (err) {
        res.status(500).json({
            message: err.message,
            status: "failure",
        });
    }
}

const logoutController = function (req, res) {
    console.log("performed logout operation");
    res.cookie("jwt", "", {
        maxAge: 0,
        httpOnly: true,
        secure: true,
    });

    res.status(200).json({
        status: "success",
        message: "user logged out",
    });
};

module.exports = {
    signupHandler,
    loginHandler,
    forgetPasswordHandler,
    resetPasswordHandler,
    logoutController,
    protectRouteMiddleWare
}