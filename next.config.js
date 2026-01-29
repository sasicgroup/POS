/** @type {import('next').NextConfig} */
const nextConfig = {}


const withSerwist = require("@serwist/next").default({
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

module.exports = withSerwist(nextConfig);
