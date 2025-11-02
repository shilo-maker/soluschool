# SOLU Worship Music School Management System

A comprehensive web-based platform designed to manage all aspects of a music school's operations.

## Features

- **Multi-Method Authentication**: Email/password, 4-digit PIN, and QR code authentication
- **User Management**: Role-based access control (Admin, Teacher, Student, Sponsor)
- **Student & Teacher Management**: Complete profiles, instruments, availability
- **Lesson Management**: Scheduling, check-in/out, real-time status
- **Live Room Overview**: Real-time display of room status with Socket.io
- **Payment & Billing**: Student payments, teacher billing, subsidy tracking
- **Reporting & Analytics**: Comprehensive reports with PDF export
- **Teacher Absence Management**: Substitute teacher matching and assignment
- **Notifications**: Automated email reminders and daily summaries
- **Internationalization**: Full English/Hebrew support with RTL layout

## Tech Stack

- **Frontend**: Next.js 15.5.4, React 19, Bootstrap 5
- **Backend**: Node.js, Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io for live updates
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer
- **PDF Generation**: jsPDF
- **QR Codes**: qrcode library

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- MongoDB (local or cloud instance)
- SMTP server for email notifications (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd soluworshipschool
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/soluschool
JWT_SECRET=your-secret-key-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CRON_SECRET=your-cron-secret
PORT=3333
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3333](http://localhost:3333) in your browser.

## Project Structure

```
soluworshipschool/
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/            # Backend API endpoints
│   │   ├── (pages)/        # Frontend pages
│   │   ├── layout.js       # Root layout
│   │   └── page.js         # Homepage
│   ├── components/         # React components
│   ├── contexts/           # React Context providers
│   ├── models/             # Mongoose database models
│   ├── lib/                # Utility functions & services
│   └── styles/             # CSS stylesheets
├── public/                 # Static assets
│   ├── images/            # Images
│   └── locales/           # Translation files (en, he)
├── server.js              # Custom Node.js + Socket.io server
├── next.config.mjs        # Next.js configuration
├── package.json           # Dependencies
└── .env.local            # Environment variables
```

## Database Models

The system uses 11 MongoDB models:

1. **User** - Core authentication (email, PIN, QR code, password)
2. **Student** - Student profiles, instruments, subsidy info
3. **Teacher** - Teacher profiles, availability, rates
4. **Lesson** - Individual lesson records with check-in/out
5. **Schedule** - Recurring lesson templates
6. **Room** - Practice/teaching rooms
7. **Payment** - Student payment records
8. **Billing** - Teacher billing records
9. **Subsidizer** - Subsidy providers
10. **TeacherAbsence** - Teacher absence tracking
11. **SubstituteRequest** - Substitute teacher requests

## Key Endpoints

### Authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/pin` - PIN-based login
- `POST /api/auth/qr` - QR code login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Lessons
- `GET /api/lessons` - List/filter lessons
- `POST /api/lessons` - Create lesson
- `GET /api/lessons/today` - Today's lessons
- `POST /api/lessons/checkin` - Check in for lesson

### Live Overview
- `GET /api/rooms/live` - Real-time room status

## Development

### Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm start       # Start production server
npm run lint    # Run ESLint
```

### Design System

The application follows a modern design system with:
- Gradient-driven UI (135deg linear gradients)
- Consistent spacing (4px multiples)
- Smooth animations (0.2s ease transitions)
- Responsive typography with clamp()
- Shadow system for depth
- Color-coded status indicators

See `DESIGN_SYSTEM_GUIDE.md` for complete design documentation.

## Internationalization

The system supports English and Hebrew with full RTL support:

- Translation files in `/public/locales/en` and `/public/locales/he`
- Language switcher on all pages
- User-specific language preferences
- RTL layout for Hebrew

## Real-Time Features

Socket.io powers real-time updates:

- Live room status updates
- Check-in notifications
- Lesson status changes
- Automatic UI refresh without page reload

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy!

### Other Platforms

The app can run on any Node.js hosting platform:
- Render.com
- Railway
- Heroku
- DigitalOcean App Platform

Make sure the platform supports:
- Node.js 18+
- Custom server (server.js)
- WebSocket connections (for Socket.io)

## Security

- Passwords hashed with bcryptjs (10 rounds)
- PINs hashed with bcryptjs
- JWT tokens in HTTP-only cookies
- Role-based access control
- Environment variable secrets
- Input validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]

## Support

For questions or issues:
- Email: support@soluisrael.org
- GitHub Issues: [Repository URL]

## Credits

Built with ❤️ for SOLU Worship Music School
