const express = require("express");
const http = require("http");
const app = require("./app");

const PORT = process.env.PORT || 3000;

//const app = express();

app.listen(PORT, () => console.log(`Server is up and running at port ${PORT}`));

app.use(express.json());
