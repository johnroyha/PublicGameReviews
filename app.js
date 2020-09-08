const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const expressSession = require("express-session");
const methodOverride = require("method-override");
const Game = require("./models/game");
const Comment = require("./models/comment");
const User = require("./models/user");

mongoose.connect("mongodb+srv://admin-john:Test123@cluster0.jmhvt.mongodb.net/PublicGameReviews", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to DB!'))
    .catch(error => console.log(error.message));

// mongoose.connect('mongodb://localhost/PublicGameReviews', { //localhost/app_name
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
//     .then(() => console.log('Connected to DB!'))
//     .catch(error => console.log(error.message));

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

app.use(expressSession({
    secret: "korewa sorewa",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});

app.get("/", function (req, res) {
    res.render("landing");
});

app.get("/games", function (req, res) {
    Game.find({}, function (err, games) {
        if (err) {
            console.log(err);
        } else {
            res.render("games/index", { games: games });
        }
    });
});

app.post("/games", isLoggedIn, function (req, res) {
    // get data from form and add to campgrounds array
    let name = req.body.name;
    let image = req.body.image;
    let desc = req.body.desc;
    let author = {
        id: req.user._id,
        username: req.user.username
    };
    let newGame = { name: name, image: image, desc: desc, author: author }
    Game.create(newGame, function (err, newlyCreated) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/games");
        }
    });
});

app.get("/games/new", isLoggedIn, function (req, res) {
    res.render("games/new");
});

app.get("/games/:id", function (req, res) { //from Game.findById(id, function)
    Game.findById(req.params.id).populate("comments").exec(function (err, game) { //game is the game corresponding to the id
        if (err) {
            console.log(err);
        } else {
            res.render("games/show", { game: game });
        }
    });
});

app.get("/games/:id/comments/new", isLoggedIn, function (req, res) {
    Game.findById(req.params.id, function (err, game) {
        if (err) {
            console.log(err);
        } else {
            res.render("comments/new", { game: game });
        }
    });
});

app.post("/games/:id/comments", isLoggedIn, function (req, res) {
    Game.findById(req.params.id, function (err, game) {
        if (err) {
            console.log(err);
            res.redirect("/games");
        } else {
            Comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    console.log(err);
                } else {
                    comment.author.id = req.user._id; //From comment.js model
                    comment.author.username = req.user.username;
                    comment.save();
                    game.comments.push(comment);
                    game.save();
                    res.redirect("/games/" + game._id);
                }
            })
        }
    });
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    var newUser = new User({ username: req.body.username });
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function () {
            res.redirect("/games");
        });
    });
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/games",
        failureRedirect: "/login"
    }), function (req, res) {
    });

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/games");
});

app.get("/games/:id/edit", checkGameOwnership, function (req, res) {
    Game.findById(req.params.id, function (err, foundGame) {
        res.render("games/edit", { game: foundGame });
    });
});

app.put("/games/:id", checkGameOwnership, function (req, res) {
    Game.findByIdAndUpdate(req.params.id, req.body.game, function (err, updatedGame) {
        if (err) {
            res.redirect("/games");
        } else {
            res.redirect("/games/" + req.params.id);
        }
    });
});

app.delete("/games/:id", checkGameOwnership, function (req, res) {
    Game.findByIdAndRemove(req.params.id, function (err) {
        if (err) {
            res.redirect("/games");
        } else {
            res.redirect("/games");
        }
    })
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}

function checkGameOwnership(req, res, next) {
    if (req.isAuthenticated()) {
        Game.findById(req.params.id, function (err, foundGame) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundGame.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.send("You do not have permission to do that."); //Not authorized
                }
            }
        });
    } else {
        res.send("You need to be logged in to do that.");
    }
}

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}


app.listen(port, function () {
    console.log("The server has started on localhost:3000");
});