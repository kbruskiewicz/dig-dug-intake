const express = require("express")
const app = express()

app.get('/', function (req, res) {
    res.send('Hello World')
})

app.post('/login', function (req, res) {
    res.send('Hello World')
})

const port = 3000;
app.listen(port, () => {
    console.log('App started on port', port)
})

