# Flight Booking System

A modern flight booking system built with Node.js, MongoDB, and Tailwind CSS. This application provides a seamless experience for users to search, book, and manage flight reservations.

## Features

- User Authentication (Register/Login)
- Flight Search and Booking
- User Dashboard
- Booking Management
- Modern UI with Tailwind CSS
- Responsive Design
- Split Screen Layout
- JWT Authentication
- MongoDB Integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flight-booking
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flightBooking
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
flight-booking/
├── config/
├── controllers/
│   └── authController.js
├── models/
│   └── User.js
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── routes/
│   ├── authRoutes.js
│   └── pageRoutes.js
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── index.ejs
│   ├── login.ejs
│   └── register.ejs
├── .env
├── package.json
├── README.md
└── server.js
```

## Technologies Used

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB
  - Mongoose
  - JWT Authentication

- **Frontend:**
  - EJS Templates
  - Tailwind CSS
  - JavaScript

- **Development Tools:**
  - Nodemon
  - dotenv
  - ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Inspired by Turkish Airlines Training Center UI
- Built with modern web development best practices
- Implements secure authentication and authorization 