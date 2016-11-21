var fs = require('fs');
const path = require('path');
var sharp = require('sharp');
var mkdirp = require('mkdirp');
var gcloud = require('google-cloud');
var storage = gcloud.storage;
var merge = require('merge'), original, cloned;
const del = require('del');

var firebase = require("firebase");

// Initialize Firebase
 var config = {
    apiKey: "AIzaSyB6NW9Z-UEEEgyv262uXJLzSHCALFkVOPI",
    authDomain: "safaridigitalapp.firebaseapp.com",
    databaseURL: "https://safaridigitalapp.firebaseio.com",
    storageBucket: "safaridigitalapp.appspot.com",
    messagingSenderId: "78200485035"
  };
firebase.initializeApp(config);
var db = firebase.database();


var gcs = storage({
  projectId: 'safaridigitalapp',
  keyFilename: 'mbecker.json'
});
var bucket = gcs.bucket('safaridigitalapp.appspot.com');

var folders = ["animals/", "attractions/"];

folders.forEach(function(folder) {
  loadFolder(folder)
});


function loadFolder(folder) {

  var storagelocation = "gs://safaridigitalapp.appspot.com/" + folder
  var ref = db.ref("park/addo/" + folder);
  ref.remove();

  del([folder])
    .then(paths => {
        console.log('Deleted files and folders: ' + folder);
        bucket.getFiles({ prefix: folder })
          .on('error', console.error)
          .on('data', function(file) {
            // file is a File object.
            file.getMetadata(function(err, metadata, apiResponse) {

              if (metadata.contentType == "image/jpeg" && metadata.name.indexOf("_3") == -1) {

                mkdirp(path.join(__dirname, folder), function (err) {
                    if (err) {
                      console.error(err)
                    } else {
                      var filepath = path.join(__dirname, folder, metadata.name.substring(folder.length, metadata.name.length));
                      file.download({
                        destination: filepath
                      }, function(err) {
                        if (err) {
                          console.log(err);
                        } else {
                          // File is saved
                          console.log(path.basename(filepath) + " -> Saved");

                          var data = {image: storagelocation + path.basename(filepath)}

                          let fileext = path.extname(filepath);
                          let file375x300 = filepath.substring(0, filepath.length - fileext.length) + '_375x300' + fileext;
                          let file327x218 = filepath.substring(0, filepath.length - fileext.length) + '_327x218' + fileext;

                          sharp(filepath)
                            .resize(375, 300)
                            .overlayWith('overlay375x300.png')
                            .toFile(file375x300, (err, info) => {
                              if (err) {
                                console.log(err);
                              } else {
                                console.log(path.basename(file375x300) + " -> Resized");

                                var options = {
                                  destination: folder + path.basename(file375x300),
                                };

                                bucket.upload(file375x300, options, function(err, file) {
                                  if (err) {
                                    console.log(err);
                                  } else {
                                    console.log(path.basename(file375x300) + " -> Uploaded");

                                    var data375x300 = {image375x300: storagelocation + path.basename(file375x300)}

                                    sharp(filepath)
                                      .resize(327, 218)
                                      .overlayWith('overlay327x218.png')
                                      .toFile(file327x218, (err, info) => {
                                        if (err) {
                                          console.log(err);
                                        } else {
                                          console.log(path.basename(file327x218) + " -> Resized");

                                          var options = {
                                            destination: folder + path.basename(file327x218),
                                          };

                                          bucket.upload(file327x218, options, function(err, file) {
                                            if (err) {
                                              console.log(err);
                                            } else {

                                              console.log(path.basename(file327x218) + " -> Uploaded");

                                              var data327x218 = {image337x218: storagelocation + path.basename(file327x218)}

                                              var datamerged = merge(data, data375x300, data327x218);

                                              var firebaseData = {
                                                name: path.basename(filepath),
                                                url: datamerged.image,
                                                images: {
                                                  image375x300: datamerged.image375x300,
                                                  image337x218: datamerged.image337x218
                                                }
                                              };

                                              console.log(firebaseData);

                                              // Get a key for a new Post.
                                              var newDataKey = ref.push().key;
                                              var updates = {};
                                              updates[newDataKey] = firebaseData;

                                              ref.update(updates);



                                            }
                                          });
                                        }
                                      });

                                  }
                                });

                              }
                            });




                        }
                      });

                    }
                });


              }

            });
          })
          .on('end', function() {
            // All files retrieved.
          });

    });

}
