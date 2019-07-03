var admin = require("firebase-admin");

var serviceAccount = require("/Users/njeri/Desktop/og-codes-firebase-adminsdk-15pxf-76452f4c5b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://og-codes.firebaseio.com"
});


const cors = require("cors")({ origin: true });
const sanitizeHtml = require('sanitize-html');

// The Cloud Functions for Firebase SDK to create functions & triggers.
const functions = require("firebase-functions");



// The express app used for routing
const app = require('express')();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// List all the posts under the path /posts, and an individual post under /posts/ID
app.get(['/', '/:id'], functions.https.onRequest((req, res) => {

  const postid = req.params.id;
  let reference = 'posts';
  reference += postid ? '/' + postid : '';

  cors(req, res, () => {
    return admin.database().ref(reference).once('value').then(function(snapshot) {
      if (snapshot.val() !== null) {
        res.status(200).send(JSON.stringify(snapshot));
      } else {
        res.status(200).send({});
      }
      return null;
    });
  });
}));

// create a new post
app.post(
  "/",
  functions.https.onRequest((req, res) => {
    cors(req, res, () => {
      let content = req.body.content ? sanitizeHtml(req.body.content, { allowedTags: [], allowedAttributes: [] }) : null;
      if (content === null) {
        res.status(200).send({ error: "Missing content" });
        return null;
      } 
      const tokenId = req.body.token;
      admin.auth().verifyIdToken(tokenId).then(function(decodedUser) {

          let uid = decodedToken.uid;
          // title can be provided, or extracted from the content
          let title = req.body.title ? sanitizeHtml(req.body.title, { allowedTags: [], allowedAttributes: [] }) : content.substr(0, 20) + '...';
          // we want the server to set the time, so use firebase timestamp
          let postDate = admin.database.ServerValue.TIMESTAMP;
          
          let postAuthor = decodedUser.name;

          // assembled data
          let postData = {
            author: postAuthor,
            title: title,
            content: content,
            created: postDate
          };

          // create a new ID with empty values
          let postKey = admin
            .database()
            .ref("posts")
            .push().key;

          
          admin.database().ref("/posts").child(postKey).set(postData, function() {
              // Read the saved data back out
              return admin.database().ref("/posts/" + postKey).once("value").then(function(snapshot) {
                  if (snapshot.val() !== null) {
                    let postJSON = snapshot.val();
                    postJSON.id = postKey;
                    res.status(200).send(JSON.stringify(postJSON));
                  } else {
                    res.status(200).send({ error: "Unable to save post" });
                  }
                  
                });
            });
        })
        .catch(err => res.status(401).send(err));
    });
    return null;
  })
);

// This works for posts/ and posts/101, but not for /posts
// exports.posts = functions.https.onRequest(app);
// @see https://gist.github.com/cdock1029/9f3a58f352663ea90f8b9675412c4aea

exports.posts = functions.https.onRequest((req, res) => {
  // Handle routing of /posts without a trailing /,
  if (!req.path) {
    // prepending "/" keeps query params, path params intact
    req.url = `/${req.url}`;
  }
  return app(req, res);
});


