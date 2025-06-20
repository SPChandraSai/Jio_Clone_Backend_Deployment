const mongoose = require("mongoose");
const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors=require("cors");
const morgan = require("morgan");
const rateLimiter = require("express-rate-limit");

dotenv.config();

const limiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
})

/******************db connection****************/
const dbLink = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.nfmi4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(dbLink)
    .then(function (connection) {
        console.log("connected to db")
    }).catch(err => console.log(err));

/******************routes and their handlers****************/
app.use(limiter)
app.use(express.json());
app.use(cookieParser());
const corsConfig = {
    origin: true,
    credentials: true,
};
// due to cors every route can be used by some other servers
app.use(cors(corsConfig));
// app.options("*", cors(corsConfig));

//Routes imports and their handlers
const AuthRouter = require("./Routers/AuthRouter");
const MovieRouter = require("./Routers/MovieRouter");
const TvShowsRouter = require("./Routers/TvRouter");
const DiscoverRouter = require("./Routers/DiscoverRouter");
const UserRouter = require("./Routers/UserRouter");
const VideoRouter = require("./Routers/VideoRouter");
const PaymentRouter = require("./Routers/PaymentRouter");

//Router middleware
app.use("/api/auth", AuthRouter);
app.use("/api/movies", MovieRouter);
app.use("/api/tv", TvShowsRouter);
app.use("/api/discover", DiscoverRouter);
app.use("/api/user", UserRouter);
app.use("/api/video", VideoRouter);
app.use("/api/payment", PaymentRouter);

//Conditional DB connection and server startup
async function startServer() {
    //Only connect to DB in development mode
    if (process.env.NODE_ENV !== 'test') {
        const dbLink = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.nfmi4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
        try {
            await mongoose.connect(dbLink);
            console.log("Connected to DB");
        } catch (err) {
            console.error("DB connection error:", err);
        }
    }
    // Define ports
    // const PORT = process.env.NODE_ENV === 'test' ? 5000 : process.env.PORT;
    // console.log("PORT from env:", process.env.PORT);
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
}

// Start server if not being required by another module (like tests)
if (process.env.NODE_ENV != 'test') {
    startServer();
}


// Export for testing
module.exports = { app };

// mongoose.connect(dbLink)
//     .then(function (connection) {
//         console.log("connected to db")
//     }).catch(err => console.log(err));