#!/bin/bash

#  Team Task Manager - Quick Start

echo " Installing dependencies..."
npm install

echo "  Setting up database..."
npx prisma db push

echo " Setup complete!"
echo ""
echo " Start development server:"
echo "   npm run dev"
echo ""
echo " Open browser to: http://localhost:3000"
echo ""
echo " Test credentials:"
echo "   Email: admin@example.com"
echo "   Password: SecurePass123"
echo ""
echo "   Documentation:"
echo "   README.md - Full documentation"
echo "   SECURITY.md - Security features"
echo "   IMPLEMENTATION.md - What was added"
