const https = require('https');

const body = JSON.stringify({
    query: `mutation { loginSessionCreate { secret token url } }`
});

const req = https.request({
    hostname: 'backboard.railway.app',
    path: '/graphql/v2',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            const session = result?.data?.loginSessionCreate;
            if (session) {
                console.log('SECRET:', session.secret);
                console.log('URL:', session.url);
            } else {
                console.log('RAW:', data);
            }
        } catch (e) {
            console.log('RAW:', data);
        }
    });
});
req.on('error', e => console.error('ERR:', e.message));
req.write(body);
req.end();
