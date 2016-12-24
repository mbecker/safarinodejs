var fs = require('fs');
const path = require('path');
var sharp = require('sharp');
var mkdirp = require('mkdirp');
var gcloud = require('google-cloud');
var storage = gcloud.storage;
var merge = require('merge'), original, cloned;
const del = require('del');
const jsonfile = require('jsonfile')

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
  // loadFolder(folder)
  // laodFiles(folder);
  readFoldersUploadToFirebase(folder);
});

function readFoldersUploadToFirebase(src) {
  var folders = getDirectories(path.join(__dirname, src));
  folders.forEach(function(folder) {
    console.log(folder);
    saveJSONtoFirebase('kruger', 'Kruger National Park', folder, src);
  });
}

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}


// saveJSONtoFirebase('addo', 'Addo Natioanl Elephant Park', 'animals');
function saveJSONtoFirebase(park, parkName, item, src){
  
  const filepath = path.join(__dirname, src, 'data.json');
  const itemFilepath = path.join(__dirname, src, item, 'data.json');
  
  const jsonBasis = jsonfile.readFileSync(filepath);
  const jsonItem  = jsonfile.readFileSync(itemFilepath);
  const number = Math.floor(Math.random() * 999) + 1;

  var itemName = '';
  var firebaseID = '';
  switch (item) {
    case 'p1120770':
      itemName = "Green Mountains"
      firebaseID = "greenmountains" + "-" + number;
      break;
    case 'ocelot':
      itemName = "Ocelot";
      firebaseID = "ocelot" + "-" + number;
      break;
    case 'maxresdefault2':
      itemName = "Lions in the wildness";
      firebaseID = "lions-in-the-wildness" + "-" + number;
      break;
    case 'maxresdefault':
      itemName = "Lions on the street";
      firebaseID = "lions-on-the-street" + "-" + number;
      break;
    case 'mandrill':
      itemName = "Mandrill";
      firebaseID = "mandrill" + "-" + number;
      break;
    case 'Giraffe1':
      itemName = "Giraffes eating";
      firebaseID = "giraffes-eating" + "-" + number;
      break;
    case 'Elephant':
      itemName = "Elephant's ass";
      firebaseID = "elephants-ass" + "-" + number;
      break;
    case 'coyote':
      itemName = "Coyote";
      firebaseID = "coyote" + "-" + number;
      break;
    case 'coati':
      itemName = "Coati";
      firebaseID = "coati" + "-" + number;
      break;
    case 'Bison1':
      itemName = "Coati";
      firebaseID = "coati" + "-" + number;
      break;
    case 'African_elephant_warning_raised_trunk':
      itemName = "Elephant raising trunk";
      firebaseID = "elephants-raising-trunk" + "-" + number;
      break;
    case '15_a_KrugerNational':
      itemName = "Elephants drinking";
      firebaseID = "elpehants-drinking" + "-" + number;
      break;
    default:
      itemName = item;
      firebaseID = item + "-" + number;
  }

  var firebaseData = {
    name: itemName
  };
  const mergedJSON = merge(firebaseData, jsonBasis);
  mergedJSON['images']['public'] = jsonItem['public'];
  mergedJSON['images']['gcloud'] = jsonItem['gcloud'];
  mergedJSON['images'].resized = {
    '375x300': {
      'public' : jsonItem['resized']['375x300']['public'],
      'gcloud' : jsonItem['resized']['375x300']['gcloud']
    }
  }
  mergedJSON['location']['parkName'] = parkName;

  var itemRef = db.ref("park").child(park).child(src).child(firebaseID);
  itemRef.remove();
  itemRef.set(mergedJSON)
    .then(function(){
        console.log('### FIREBASE SAVED ###');
        return // process.exit();
    })
    .catch(function(error){
        console.log('### FIREBASE ERROR ###');
        console.log(error);
        return // process.exit();
    });
  
}

/*
 * Load files form glcoud storage, save local to 'foldername/filename/filename_375x300.jpeg', resize, upload resized file to glocud
 * Make all images (original, resized) public
 * Save JSON with gcloud and public url in JSON
 */
function laodFiles(folder) {

  const storageLocation = "gs://safaridigitalapp.appspot.com/" + folder

  var i = 0;
  var jsonObjectAll = jsonfile.readFileSync(path.join(__dirname, 'basis.json'));
  
  bucket.getFiles({ prefix: folder })
    .on('error', console.error)
    .on('response', function() {
      console.log("########## RESPONSE");
    })
    .on('end', function() {
      console.log("########## END");
      console.log(jsonObjectAll);
    })
    .on('data', function(file) {
      // 1. Get Metadata to identify images image/jpeg and that image is not yet resized
      file.getMetadata(function(err, metadata, apiResponse) {
        if (metadata.contentType == "image/jpeg" && metadata.name.indexOf("_3") == -1 && metadata.name.indexOf("-K") == -1) {
          // 2. Get filename without bucket/folder and extension
          const filename = file.name.split("/")[1].split(".")[0];
          // 3. Create folder for each file
          mkdirp(path.join(__dirname, folder, filename), function (err) {
            if(err){
              return console.log('### Folder not created for: ' + folder + ' / ' + filename);
            }
            // 4. Create filepath with filename.jpeg (metadata)
            var filepath = path.join(__dirname, folder, filename, file.name.split("/")[1]);
            // 5. Download file
            file.download({destination: filepath}, function(err){
              if(err) {
                return console.log('### File not downloaded: ' + folder + ' / ' + filename);
              }
              // 6. Filenamse for resized images
              let fileext = path.extname(filepath);
              let file375x300 = filepath.substring(0, filepath.length - fileext.length) + '_375x300' + fileext;
              let file327x218 = filepath.substring(0, filepath.length - fileext.length) + '_327x218' + fileext;

              // 7. Resize to 375x300
              sharp(filepath)
                .resize(375, 300)
                .overlayWith('overlay375x300.png')
                .toFile(file375x300, (err, info) => {
                  if(err){
                    return console.log('### File not downloaded: ' + file375x300);
                  }
                  // 8. File is saved; upload file
                  console.log('--- File saved and resized: ' + folder + path.basename(file375x300));
                  // destintaion: animals/FILENAME_375x300.jpg
                  var options = {
                    destination: folder + path.basename(file375x300),
                  };
                  bucket.upload(file375x300, options, function(err, resizedFile) {
                    if(err){
                      return console.log("### File not uploaded: " + folder + path.basename(file375x300));
                    }
                    // 9. MAKE PUBLIC: Original Image
                    file.makePublic(function(err, apiResponse) {
                      if(err){
                        return console.log("### File public ERROR: " + folder + filename);
                      }
                      const filePublicURL = 'https://storage.googleapis.com/safaridigitalapp.appspot.com/' + folder + file.name.split("/")[1];
                      
                      // 10. MAKE PUBLIC: Resized Image
                      resizedFile.makePublic(function(err, apiResponse) {
                        if(err){
                          return console.log("### File public ERROR: " + folder + path.basename(file375x300));
                        }
                        const fileResizedPublicURL = 'https://storage.googleapis.com/safaridigitalapp.appspot.com/' + folder + path.basename(file375x300);
                        // 11. JSON
                        var jsonObject = {
                          gcloud: storageLocation + path.basename(filepath),
                          public: filePublicURL,
                          resized: {
                            '375x300': {
                              gcloud: storageLocation + path.basename(file375x300),
                              public: fileResizedPublicURL
                            }
                          }
                        }
                        jsonObjectAll['images'][i] = jsonObject;
                        // jsonObjectAll = merge(jsonObjectAll, jsonObjectMerge);
                        i = i + 1;
                        
                        // 10. Write JSON to file
                        var jsonPath = path.join(__dirname, folder, filename, 'data.json');
                        jsonfile.writeFile(jsonPath, jsonObject, {spaces: 2}, function(err) {
                          if(err) {
                            console.error(err)
                          }
                          
                          var jsonPathAll = path.join(__dirname, folder, 'data.json');
                          jsonfile.writeFile(jsonPathAll, jsonObjectAll, {spaces: 2}, function(err) {
                            console.log("--- JSON SAVED---");
                            console.log("     " + jsonPath);
                            console.log("-----------------");
                            return
                          })
                          
                        })


                      })
                    })

                  })
                })

            })

          })
        }
      })
    })
    
}

function loadFolder(folder) {

  var storagelocation = "gs://safaridigitalapp.appspot.com/" + folder
  var ref = db.ref("park/adddo/" + folder);
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
                                                
                                                images: {
                                                  image375x300: datamerged.image375x300,
                                                  image337x218: datamerged.image337x218,
                                                  image0 : "gs://safaridigitalapp.appspot.com/animals/15_a_KrugerNational.jpg",
                                                  image1 : "gs://safaridigitalapp.appspot.com/animals/Bison1.jpg",
                                                  image2 : "gs://safaridigitalapp.appspot.com/animals/coati.jpg",
                                                  image3 : "gs://safaridigitalapp.appspot.com/animals/mandrill.jpg",
                                                  image4 : "gs://safaridigitalapp.appspot.com/animals/mandrill.jpg",
                                                  image5 : "gs://safaridigitalapp.appspot.com/animals/Bison1.jpg"
                                                },
                                                imagesPublic: {
                                                  image0 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2F15_a_KrugerNational.jpg?alt=media&token=eb5c6e80-7680-43fc-8841-2d6dbcdb0c04",
                                                  image1 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2FBison1.jpg?alt=media&token=37cca9ce-4ebc-4362-aaa6-9cf2ebaa3c12",
                                                  image2 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2Fcoati.jpg?alt=media&token=9c24a9fe-0d4a-44a6-b5c9-6fa62326aea7",
                                                  image3 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2Fmandrill.jpg?alt=media&token=0dab10e4-bb6e-4ceb-aa48-35330a571073",
                                                  image4 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2Fmandrill.jpg?alt=media&token=0dab10e4-bb6e-4ceb-aa48-35330a571073",
                                                  image5 : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2FBison1.jpg?alt=media&token=37cca9ce-4ebc-4362-aaa6-9cf2ebaa3c12"
                                                },
                                                location : {
                                                  latitude : -23.888061,
                                                  longitude : 31.969589,
                                                  parkName: "National Addo Elephant Park"
                                                },
                                                spottedby : {
                                                  '121asdy23abv' : {
                                                    name : "Michael",
                                                    profile : "https://storage.googleapis.com/safaridigitalapp.appspot.com/icons/lego6.jpg"
                                                  },
                                                  '123abv' : {
                                                    name : "Mike",
                                                    profile : "https://storage.googleapis.com/safaridigitalapp.appspot.com/icons/lego3.jpg"
                                                  }
                                                },
                                                tags : {
                                                  Creek : "Creek",
                                                  Dinosaur : "Dinosaur",
                                                  Dolphin : "Dolphin",
                                                  Duck : "Duck",
                                                  Elephant : "Elephant",
                                                  Forest : "Forest",
                                                  Fountain : "Fountain"
                                                },
                                                timestamp : 1481313506827,
                                                url: datamerged.image,
                                                urlPublic : "https://firebasestorage.googleapis.com/v0/b/safaridigitalapp.appspot.com/o/animals%2FGiraffe1.JPG?alt=media&token=ff60a8ac-d078-4a22-8b0b-b90bad21c8e2",
                                                urlSigned : {
                                                  expires : "03-17-2025",
                                                  url : "https://storage.googleapis.com/safaridigitalapp.appspot.com/animals/Giraffe1.JPG?GoogleAccessId=owner-598@safaridigitalapp.iam.gserviceaccount.com&Expires=1742166000&Signature=PnduVpk4j54wCIBPnnQNuvum0Mj0gTxnxwdxR92u5vQr64j5FJ6jCxALQ2ZIDilrGE5NOUxUbjTaWVXoBdhUP%2B5R2a3oCC6ue%2FmoMzPEwWwrt9XFKoS7dfvFTFDdBJzBUcsfpH%2Fuo5qfC2Cb6mb6FZkWfJZKlqCpektSBflzMLG9E%2BF2Qs0PsT5%2BNFDibR%2BDlcxfHcwGTSDZPFfmRgXTEBfQ%2BkT7hOfwB4qnGVLXdtUqI%2BzQZeFZl%2BK%2BZT%2BiA4yhodLjTSLbxWSEVzgN2hc1PqFaUlbKOZXvv4QZgyeBLsOXlbditjggssssp%2BbMQfpDisxmSmaw9nimB2nu4PUVWw%3D%3D"
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
