// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all interactive features
    initMobileMenu();
    initSmoothScrolling();
    initProcessAccordion();
    initTestimonialsSlider();
    initContactForm();
    initAnimations();
    initScrollEffects();
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    }
}

// Smooth Scrolling for Navigation Links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Process Accordion
function initProcessAccordion() {
    const processCards = document.querySelectorAll('.process-card');
    
    processCards.forEach(card => {
        const toggle = card.querySelector('.process-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', function() {
                const isActive = card.classList.contains('active');
                
                // Close all cards
                processCards.forEach(c => {
                    c.classList.remove('active');
                    const content = c.querySelector('.process-content');
                    const divider = c.querySelector('.process-divider');
                    const toggleBtn = c.querySelector('.process-toggle');
                    
                    if (content) content.style.display = 'none';
                    if (divider) divider.style.display = 'none';
                    if (toggleBtn) toggleBtn.textContent = '+';
                });
                
                // Open clicked card if it wasn't active
                if (!isActive) {
                    card.classList.add('active');
                    const content = card.querySelector('.process-content');
                    const divider = card.querySelector('.process-divider');
                    
                    if (content) content.style.display = 'block';
                    if (divider) divider.style.display = 'block';
                    toggle.textContent = '−';
                    
                    // Add content based on step
                    updateProcessContent(card);
                }
            });
        }
    });
}

// Update Process Content
function updateProcessContent(card) {
    const content = card.querySelector('.process-content p');
    const title = card.querySelector('.process-title').textContent;
    
    if (content) {
        const contentMap = {
            'Tell Your Story': 'Chat with our AI about your issue. It asks smart questions to understand exactly what you need, just like talking to a knowledgeable friend who actually listens.',
            'AI Research & Strategy': 'Our AI analyzes your situation, researches the best approach, and identifies the right people to contact. It knows company policies, escalation procedures, and the most effective communication strategies.',
            'Automated Contact': 'DialZero contacts customer service on your behalf, navigating phone trees, waiting on hold, and speaking directly with representatives using natural language AI.',
            'Real-Time Updates': 'Get live updates as your case progresses. See transcripts of conversations, know when escalations happen, and track every step of the resolution process.',
            'Problem Resolved': 'Receive confirmation when your issue is resolved, along with a complete summary of actions taken. Your time is saved, your problem is solved, and your sanity is intact.'
        };
        
        content.textContent = contentMap[title] || content.textContent;
    }
}

// Testimonials Slider
function initTestimonialsSlider() {
    const slider = document.querySelector('.testimonials-slider');
    const cards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.nav-prev');
    const nextBtn = document.querySelector('.nav-next');
    
    let currentIndex = 0;
    const totalCards = cards.length;
    
    if (slider && cards.length > 0) {
        // Auto-slide functionality
        setInterval(() => {
            nextSlide();
        }, 5000);
        
        // Next button
        if (nextBtn) {
            nextBtn.addEventListener('click', nextSlide);
        }
        
        // Previous button
        if (prevBtn) {
            prevBtn.addEventListener('click', prevSlide);
        }
        
        // Dot navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                goToSlide(index);
            });
        });
        
        function nextSlide() {
            currentIndex = (currentIndex + 1) % totalCards;
            updateSlider();
        }
        
        function prevSlide() {
            currentIndex = (currentIndex - 1 + totalCards) % totalCards;
            updateSlider();
        }
        
        function goToSlide(index) {
            currentIndex = index;
            updateSlider();
        }
        
        function updateSlider() {
            // Update slider position
            const offset = -currentIndex * (606 + 50); // card width + gap
            slider.style.transform = `translateX(${offset}px)`;
            
            // Update dots
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
        }
    }
}

// Contact Form
function initContactForm() {
    const form = document.querySelector('.contact-form');
    const radioOptions = document.querySelectorAll('.radio-option');
    
    // Radio button functionality
    radioOptions.forEach(option => {
        option.addEventListener('click', function() {
            radioOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
    
    // Form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Connecting Your AI Agent...';
            submitBtn.disabled = true;
            
            // Simulate form submission
            setTimeout(() => {
                alert('Thank you! Your AI agent is being prepared. We\'ll contact you within 24 hours to get started.');
                form.reset();
                radioOptions[0].classList.add('active');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Add success animation
                submitBtn.style.background = '#B9FF66';
                submitBtn.style.color = '#000000';
                submitBtn.textContent = '✓ AI Agent Activated!';
                
                setTimeout(() => {
                    submitBtn.style.background = '';
                    submitBtn.style.color = '';
                    submitBtn.textContent = originalText;
                }, 3000);
            }, 2000);
        });
    }
}

// Animations on Scroll
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const elementsToAnimate = document.querySelectorAll(
        '.service-card, .cta-card, .process-card, .testimonial-card, .stat-item'
    );
    
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

// Scroll Effects
function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Navbar background opacity
        if (currentScrollY > 50) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            navbar.style.backdropFilter = 'blur(5px)';
        }
        
        // Hide/show navbar on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Service Card Hover Effects
document.addEventListener('DOMContentLoaded', function() {
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.service-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
                icon.style.transition = 'all 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.service-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
});

// Chat Bubble Animation
function animateChatBubbles() {
    const chatBubbles = document.querySelectorAll('.chat-bubble');
    
    chatBubbles.forEach((bubble, index) => {
        setTimeout(() => {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
                bubble.style.transition = 'all 0.5s ease';
            }, 100);
        }, index * 1000);
    });
}

// Initialize chat animation when contact section is visible
const contactSection = document.querySelector('.contact');
if (contactSection) {
    const contactObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    animateChatBubbles();
                }, 500);
                contactObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    contactObserver.observe(contactSection);
}

// Newsletter Form
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const input = this.querySelector('input');
        const button = this.querySelector('button');
        const originalText = button.textContent;
        
        button.textContent = 'Subscribing...';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = '✓ Subscribed!';
            button.style.backgroundColor = '#B9FF66';
            input.value = '';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.disabled = false;
            }, 2000);
        }, 1000);
    });
}

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
    // ESC key closes mobile menu
    if (e.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        }
    }
    
    // Arrow keys for testimonials
    if (e.key === 'ArrowLeft') {
        const prevBtn = document.querySelector('.nav-prev');
        if (prevBtn) prevBtn.click();
    }
    
    if (e.key === 'ArrowRight') {
        const nextBtn = document.querySelector('.nav-next');
        if (nextBtn) nextBtn.click();
    }
});

// Performance Optimization
// Lazy load images when they come into view
const lazyImages = document.querySelectorAll('img[data-src]');
if (lazyImages.length > 0) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

// Error Handling
window.addEventListener('error', function(e) {
    console.warn('An error occurred:', e.error);
    // Gracefully handle errors without breaking the user experience
});

// Console Message
console.log('%c🤖 DialZero Landing Page Loaded Successfully!', 'color: #B9FF66; font-size: 16px; font-weight: bold;');
console.log('%cSkip the wait, beat the bots! 🚀', 'color: #191A23; font-size: 14px;');
