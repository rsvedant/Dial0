# DialZero Landing Page

A beautiful, responsive landing page for DialZero - the AI agent that helps users bypass frustrating customer service experiences.

## 🎨 Design Inspiration

This landing page is inspired by the Positivus design system from Figma, adapted for DialZero's unique value proposition of using AI to beat customer service bots.

## 🚀 Features

- **Responsive Design**: Fully responsive across desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional design with smooth animations
- **Interactive Elements**: 
  - Collapsible process accordion
  - Testimonials slider with auto-play
  - Animated contact form
  - Smooth scrolling navigation
- **Performance Optimized**: Fast loading with optimized assets
- **Accessibility**: Keyboard navigation and focus management

## 📁 File Structure

```
landing-page/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # Interactive functionality
├── DialZero.svg        # Custom logo
└── README.md           # This file
```

## 🎯 Sections

1. **Hero Section**: Compelling headline with animated visual showing AI vs traditional bots
2. **Services/Use Cases**: Grid of common customer service frustrations DialZero solves
3. **Call-to-Action**: Statistics and benefits with clear action button
4. **How It Works**: 5-step process accordion explaining the user journey
5. **Testimonials**: Sliding carousel of success stories
6. **Contact Form**: Lead capture with radio buttons and textarea
7. **Footer**: Complete navigation and contact information

## 🎨 Color Palette

- **Primary Green**: `#B9FF66` - Used for accents and highlights
- **Dark**: `#191A23` - Main text and primary buttons
- **Light Grey**: `#F3F3F3` - Background sections and cards
- **White**: `#FFFFFF` - Main background and contrast
- **Black**: `#000000` - Text and borders

## 🔤 Typography

- **Font Family**: Space Grotesk (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Responsive sizing**: Scales down appropriately on mobile

## 📱 Responsive Breakpoints

- **Desktop**: 1240px+ (default)
- **Tablet**: 768px - 1239px
- **Mobile**: 320px - 767px

## ⚡ JavaScript Features

- **Mobile Menu**: Hamburger menu for mobile navigation
- **Smooth Scrolling**: Animated scrolling to sections
- **Process Accordion**: Expandable/collapsible steps
- **Testimonials Slider**: Auto-rotating testimonials with manual controls
- **Form Handling**: Interactive form with validation and animations
- **Scroll Effects**: Dynamic navbar behavior on scroll
- **Intersection Observer**: Animations triggered when elements come into view

## 🛠️ Customization

### Colors
Update the CSS custom properties in `styles.css`:
```css
:root {
  --primary-green: #B9FF66;
  --dark: #191A23;
  --light-grey: #F3F3F3;
}
```

### Content
- Edit text content directly in `index.html`
- Update testimonials in the testimonials section
- Modify process steps in the process section
- Change contact information in the footer

### Logo
Replace `DialZero.svg` with your own logo file, maintaining the same dimensions (36x36px recommended).

## 🌟 Key Design Elements

- **Service Cards**: Hover effects with different background colors
- **Process Cards**: Accordion-style expandable content
- **Hero Animation**: Floating elements showing AI vs traditional bots
- **Chat Simulation**: Animated chat bubbles in contact section
- **Shadow Effects**: Consistent box shadows throughout for depth
- **Border Radius**: 45px for cards, 14px for buttons (following Figma design)

## 📈 Performance

- Optimized images and SVGs
- Minimal JavaScript dependencies
- Efficient CSS with mobile-first approach
- Lazy loading for images (when implemented)
- Debounced scroll events

## 🔧 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📞 Contact Integration

The contact form is ready for backend integration. Current implementation includes:
- Form validation
- Loading states
- Success animations
- Email capture for newsletter

## 🎭 Animation Details

- **Fade-in animations** for sections as they scroll into view
- **Hover effects** on interactive elements
- **Loading states** for form submissions
- **Smooth transitions** throughout the interface
- **Floating animations** for hero illustrations

## 💡 Usage Tips

1. **Test on multiple devices** to ensure responsive design works properly
2. **Customize the content** to match your specific use cases
3. **Update contact information** in the footer
4. **Replace placeholder testimonials** with real customer feedback
5. **Integrate with your backend** for form submissions

## 🚀 Deployment

This is a static site that can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any static hosting service

Simply upload all files to your hosting provider and point to `index.html` as the main file.

---

Built with ❤️ for DialZero - Skip the wait, beat the bots!
