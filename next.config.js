/** @type {import('next').NextConfig} */

const nextConfig = {
    images: {
        domains: ['images.unsplash.com'],
    },
    swcMinify: false,
    experimental: {
        forceSwcTransforms: false,
    }
};



module.exports = nextConfig;