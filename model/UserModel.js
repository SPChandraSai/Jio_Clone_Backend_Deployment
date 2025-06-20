const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema({
    poster_path: { type: String, required: true },
    name: { type: String, required: true },
    id: { type: String, required: true }
});

/*************************user Module***********************/
//user create -> Jio cinemas -> set of rules below which they should follow to obtain the desird thing.
const schemaRules = {
    name: {
        type: String,
        required: [true, "name is required"],
    },
    email: {
        type: String,
        required: [true, "email is required"],
        unique: [true, "email should be unique"],
    },
    password: {
        type: String,
        required: [true, "password is required"],
        minLength: [6, "password should be atleast of 6 length"],
    },
    confirmPassword: {
        type: String,
        required: true,
        minLength: 6,
        //custom validation
        validate: [function () {
            return this.password == this.confirmPassword;
        }, "password should be equal to confirm password"]
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        default: "user"
    },
    otp: {
        type: String
    },
    otpExpire: {
        type: Date
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    wishlist: [wishlistItemSchema],
}

const userSchema = new mongoose.Schema(schemaRules);

/**************************hooks in mongodb**************************/
//this will not let confirmPassword to store itself in the db
userSchema.pre("save", function (next) {
    console.log("Pre save was called");
    this.confirmPassword = undefined;
    next();
})

// these are the only possible values for the role
const validRoles = ["user", "admin", "feed curator", "moderator"];
userSchema.pre("save", function (next) {
    const isValid = validRoles.find((role) => { return this.role == role });
    if (isValid) {
        next();
    } else {
        next("Role is not allowed ")
    }
})

userSchema.post("save", function () {
    console.log("Post save was called");
    this.__v = undefined;
    this.password = undefined;
})
//final touch point -> means whatever changes u make will go through schemaRules.
const UserModel = mongoose.model("User", userSchema);
//default export
module.exports = UserModel;