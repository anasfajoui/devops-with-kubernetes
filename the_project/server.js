const Koa = require('koa')
const app = new Koa()

const PORT = process.env.PORT || 3000;

const createRandomString = () => Math.random().toString(36).substr(2, 6)

const startingString = createRandomString()

app.use(async ctx => {
    if (ctx.path.includes('favicon.ico')) return

    const stringNow = createRandomString()
    console.log('--------------------')
    console.log(`Responding with ${stringNow}`)

    ctx.type = 'html'
    ctx.body = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>The Project Server</title>
        </head>
        <body>
            <h1>Application ${startingString}</h1>
            <p>Request: ${stringNow}</p>
        </body>
        </html>
    `
});

app.listen(PORT)

console.log(`Started with ${startingString}, listening on port ${PORT}`)