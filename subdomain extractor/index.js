const express = require('express');
const app = express();

// Middleware to extract subdomain
app.use((req, res, next) => {
    const host = req.headers.host;
    const subdomain = host.split('.')[0];
    req.subdomain = subdomain;
    next();
});

app.get('/', (req, res) => {
    res.send(`v3 Subdomain: ${req.subdomain}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
