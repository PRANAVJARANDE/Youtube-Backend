# YouTube Backend

This repository contains the backend code for a YouTube clone application. The backend is built using Node.js, Express, and MongoDB and provides essential features for a video-sharing platform, such as user authentication, video management, and social interactions like subscribing, liking, commenting, and more.

## Features

- **User Authentication**: Secure login and registration using JWT tokens (access and refresh tokens).
- **Video Management**: Users can upload, update, and delete videos, with media storage handled by Cloudinary.
- **Subscriptions**: Users can subscribe to channels and manage their subscriptions.
- **Likes**: Users can like videos and comments to show their appreciation.
- **Tweets & Comments**: Users can post tweets, comment on videos, and like comments to interact with the content.
- **User Profile**: Users can update their profile information, including avatars and other personal details.

## Technology Stack

- **Node.js**: A JavaScript runtime for building server-side applications.
- **Express.js**: A fast and minimalist web framework for Node.js.ā
- **MongoDB**: A NoSQL database for storing application data.
- **Mongoose**: An ODM (Object Data Modeling) library for MongoDB and Node.js.
- **JWT**: JSON Web Tokens for secure user authentication.
- **Cloudinary**: A cloud storage service for managing video and image uploads.

## Database Schema

![Database Schema](/Schema.png)


## Testing

All routes have been thoroughly tested using Postman to ensure they work as intended. Each functionality, including authentication, video management, and interactions, has been validated for reliability.
