var express = require("express");
// var controller = express.Router();
var app = express();

var db = require("../models");
var axios = require("axios");
var cheerio = require("cheerio");

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios
    .get("https://www.buzzfeednews.com/section/tech")
    .then(function (response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);

      // Now, we grab every h2 within an article tag, and do the following:
      $("article h2").each(function (i, element) {
        // Save an empty result object
        var result = {};

        // Add the text and href of every link, and save them as properties of the result object
        result.image = $(this)
          .parent()
          .siblings(".newsblock-story-card__image-link")
          .children(".img-wireframe__image-container")
          .children("img")
          .attr("src");
        result.title = $(this).children("a").text();
        result.summary = $(this).siblings("p").text();
        result.link = $(this).children("a").attr("href");

        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function (dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function (err) {
            // If an error occurred, log it
            console.log(err);
          });
      });

      // Send a message to the client
      res.send("Scrape Complete");
    });
});

app.get("/", function (req, res) {
  // Limit set to only show first 20 articles.
  db.Article.find({})
    .limit(20)
    .then(function (scrapedData) {
      // Save all scraped data into a handlebars object.
      var hbsObject = { articles: scrapedData };
      // console.log(hbsObject);
      // Send all found articles as an object to be used in the handlebars receieving section of the index.
      res.render("index", hbsObject);
    })
    .catch(function (error) {
      // If an error occurs, send the error to the client.
      res.json(error);
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with its comment(s)
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("comment")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Comment.create(req.body)
    .then(function (dbComment) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { comment: dbComment._id },
        { new: true }
      );
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.delete("/drop-articles", function (req, res, next) {
  db.Article.remove({}, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Articles dropped!");
    }
  }).then(function (dropcomments) {
    db.Comment.remove({}, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Comments dropped!");
      }
    });
  });
});

module.exports = app;
