const Koa = require('koa')
const app = new Koa()

const PORT = process.env.PORT || 3000;

let latest = { timestamp: null, randomstring: null };

const refreshString = () => {
    const randomstring = (Math.random() + 1).toString(36).substring(2);
    const timestamp = new Date();
    latest = {timestamp, randomstring};
    console.log(timestamp, randomstring);
}

setInterval(refreshString, 5000);

app.use(async ctx => {
    if (ctx.path.includes('favicon.ico')) return

    console.log('--------------------')
    console.log(`Responding with ${latest.timestamp} ${latest.randomstring}`)

    ctx.body = latest

}); 

app.listen(PORT)
