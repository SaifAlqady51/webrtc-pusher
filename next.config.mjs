/** @type {import('next').NextConfig} */
const nextConfig = {
    env:{
        PUSHER_APP_ID: process.env.PUSHER_APP_ID,
        PUSHER_KEY: process.env.PUSHER_KEY,
        PUSHER_SECRET: process.env.PUSHER_SECRET,

    }
};

export default nextConfig;
