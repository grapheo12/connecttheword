var express = require('express');
var bp = require('body-parser');

var app = express();
app.use(express.static(__dirname + '/static'));
var uec = bp.urlencoded({extended: true});

var players = {count: 0, Players: []};
var chatdata;
var wordstk;
var connect = false;
var disconnector = null;
var word;
var revealed = -1;
var person1 = null;
var person2 = null;
var wordbuff = {};

function flush_db(){
    chatdata = {n: 0, posts: []};
    wordstk = [];
}

flush_db();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/loginform.html');
});

app.post('/reg', uec, (req, res) => {
    // console.log(req);
    players.count++;
    let remote_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
                    req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    players.Players.push({ip: remote_ip, active: true, tokenId: players.count, name: req.body.name});
    // console.log(players);
    res.send(String(players.count));
});

app.get('/main', (req, res) => {
    res.sendFile(__dirname + '/static/main.html');
});

app.get('/playerInfo', (req, res) => {
    res.send(JSON.stringify(players));
});

app.post('/postmsg', uec, (req, res) => {
    chatdata.n++;
    chatdata.posts.unshift({tokenId: req.body.tokenId, msg: req.body.msg});
    // console.log(chatdata);
    res.send("Done");
}); 

app.get('/feedcontrol', (req, res) => {
    if (connect)
        res.send("connect");
    else{
        // console.log(req.query);
        let reqd = chatdata.n - Number(req.query.postcount);
        if (reqd <= 0){
            res.send(JSON.stringify({n: 0, posts: []}));
        }else{
            res.send(JSON.stringify({n: reqd, posts: chatdata.posts.slice(reqd - 1)}));
        }
    }
});

app.post('/reqConn', uec, (req, res) => {
    if (!connect){
        person1 = req.body.person1;
        person2 = req.body.person2;
        wordbuff = {};
        connect = true;
        res.send("Ok");
        console.log("Connected!");
    }else
        res.send("Still Connected");
});

app.get('/conndata', (req, res) => {
    if (connect){
        res.send(JSON.stringify({person1: person1, person2: person2, disconnector: disconnector}));
    }else{
        res.send("No connection");
    }
});

app.post('/wordpost', uec, (req, res) => {
    wordbuff[req.body.tokenId] = req.body.word;
    if (disconnector in wordbuff && person1 in wordbuff && person2 in wordbuff){
        connect = false;
        person1 = null;
        person2 = null;
        judgeWords();
    }

    res.send("Ok");
});

app.get('/revealword', (req, res) => {
    if (revealed == -1){
        disconnector = null;
        flush_db();
        res.send(" ");
    }else
        res.send(word.slice(0, revealed));
});

app.get('/disconnect', (req, res) => {
    res.sendFile(__dirname + '/static/disconnect.html');
});

app.post('/submitword', uec, (req, res) => {
    disconnector = req.body.tokenId;
    word = req.body.word;
    revealed = 0;
    flush_db();
    res.send("Ok");
});

function judgeWords(){
    let d = wordbuff[disconnector];
    let p1 = wordbuff[person1];
    let p2 = wordbuff[person2];

    if (p1 == word || p2 == word || d == word)
        revealed = -1;
    else if (wordstk.indexOf(p1) != -1 || wordstk.indexOf(p2) != -1){
        if (wordstk.indexOf(p1) == -1)
            wordstk.push(p1);
        if (wordstk.indexOf(p2) == -1)
            wordstk.push(p2);    
    }else if (p1 == p2 && p2 != d && p1 != "" && p1.startsWith(word.slice(0, revealed))){
        if (revealed == word.length - 1)
            revealed = -1;
        else
            revealed++;
    }
}


        



app.listen(process.env.PORT ||5000);
