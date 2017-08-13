var firebase = require("firebase-admin");
var serviceAccount = require("./Mis-Series-9076f9f37a77.json");
var request = require("request");
var URL_BASE = "http://seriesdanko.to/serie.php?serie=";
var REGEX_BASE = "<a\\shref='(capitulo.*?serie=(\\d+)&temp=(\\d+)&.*?)'>(.*?)</a>.*?<br>";
var timer = null;

firebase.initializeApp({
	credential: firebase.credential.cert(serviceAccount),
	databaseURL: "https://mis-series-9f0e3.firebaseio.com"

});

var db = firebase.database();
var capitulosRef = db.ref("/Capitulos");
var seriesRef = db.ref('/Series');
var clientRef = db.ref('/Clients');

function checkData() {
	seriesRef.once('value').then(function(snapshot) {
		console.log("Comprobando nuevos caps");
		snapshot.forEach(function(snap) {
			updateCapsSerie(snap.key, false);

		});
	});

}

capitulosRef.on('child_added', function(data) {

	console.log("added capitulo :" + data.val().name);

	if (data.val().notify === false) {
		console.log("notify capitulo");

		clientRef.once('value').then(function(snapshot) {
			var tokens = [];
			snapshot.forEach(function(snap) {
				tokens.push(snap.val().token);
				//sendNotify(snap.val().token, data.val());
			});

			console.log("notify :" + data.val());
			//notify
			sendNotify(tokens, data.val());
		});

		capitulosRef.child(data.key).update({
			"notify": true
		});

	}
});

seriesRef.on('child_removed', function(data) {
	stopTimer(timer);
	console.log('stopTimer--------------------------->');

	capitulosRef.orderByChild('seriecode').equalTo(data.key).once('value').then(function(snapshot) {

		console.log('Remove capitulos :' + snapshot.val())
		snapshot.forEach(function(snap) {
			capitulosRef.child(snap.key).remove();
			console.log('Remove capitulo :' + snap.val().name)
		});
		startTimer();
		console.log('Start Timer--------------------------->');
	});

});

seriesRef.on('child_added', function(data) {
	console.log('Serie added');
	console.log('stopTimer--------------------------->');
	stopTimer(timer);
	updateCapsSerie(data.key, true);
	console.log('Start Timer--------------------------->');
	startTimer();

});

function updateCapsSerie(code, notify) {

	var match = new RegExp(REGEX_BASE, "gim");
	request({
		uri: URL_BASE + code,
		method: "GET",
		timeout: 10000,
		followRedirect: false,
		maxRedirects: 10
	}, function(error, response, data) {
		if (error) {
			console.log(error);
			return;
		}
		var temps = 0;

		while ((myArray = match.exec(data)) !== null) {

			var dataCapitulo = {
				url: myArray[1],
				seriecode: myArray[2],
				temp: myArray[3],
				name: myArray[4],
				notify: notify,
				visto: false
			};
			console.log("comprueva  : " + dataCapitulo.name);
			capitulosRef.child(dataCapitulo.name).once('value', function(snapshot) {
				if (!snapshot.exists()) {
					console.log("cap añadido  : " + dataCapitulo.name);
					capitulosRef.child(dataCapitulo.name).set(dataCapitulo);
					temps = myArray[3];
					seriesRef.child(code).update({
						temps: temps
					});
				}

			});


		}

	});

}

function sendNotify(token, data) {

	
	var json = {
		"registration_ids": token,
		"data": data
	};
	request({
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'key=AAAATHfGOY4:APA91bEl3g0QvEGh2B7GrLzrWf-w1k6Ld12vJ9xyAvwZnxnU-0pKCvd1mEvS3r8n1O68Mkmr42jkKKy_Ll9WBaVuIb_p9ewCh9L3Sm88BTZ3Ew6BgFUMd0SxtKO0ZCP5M2V8gs5U6W-K'
		},
		uri: 'https://fcm.googleapis.com/fcm/send',
		method: "POST",
		body: JSON.stringify(json),
	}, function(err, res, body) {
		if(err){
			console.error("Error : " + err);
		}
		console.log("Status code : " + res.StatusCode);
		console.log("Body : " + body);
		console.log("Mensages enviados!");
	});

};

function startTimer() {

	timer = setInterval(checkData, 6000);
}

function stopTimer(timer) {
	if (timer != null) {
		clearInterval(timer);

	}

}

startTimer();


