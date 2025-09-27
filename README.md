# LagosTechBoy Portfolio 🚀

A clean, minimal, and modern portfolio website built with **React + TypeScript + TailwindCSS**.  
The site showcases my work, bio, and contact links in a way that’s fast, responsive, and future-proof.

---

## ✨ Features
- ⚡ **Fast Frontend** – Built with modern tooling for speed and responsiveness.  
- 🖥 **Dynamic Content** – All data (bio, projects, contact) is pulled from a **WordPress backend** via REST API.  
- 🎨 **Minimalist UI** – Inspired by a terminal-like developer aesthetic with smooth animations.  
- 🔄 **Headless CMS Workflow** – Content managed in WordPress, frontend updates automatically.  

---

## 🗂 Project Structure
/src
├── index.tsx # Main React entry point
├── index.css # Global styles
├── components/ # Reusable UI components
└── utils/ # API helpers
index.html # Root HTML file
metadata.json # Metadata (SEO, config, etc.)

yaml
Copy code

---

## 🛠 How It Works

### 1. WordPress Backend
- Projects are managed as a **Custom Post Type** (`projects`).  
- Custom fields (via ACF) store stack, repo URL, live URL, etc.  
- Global site settings (hero, about, contact) are managed via an **ACF Options Page**.  

### 2. Frontend
- On load, the app fetches content from the **WordPress REST API** (`/wp-json/wp/v2/...`).  
- The frontend dynamically builds sections:  
  - **Hero** → Title + tagline  
  - **About** → Bio + photo  
  - **Projects** → Title, description, stack, links  
  - **Contact** → Email, GitHub, LinkedIn, etc.  

### 3. Fallback / Loading State
- Displays subtle placeholders while fetching content.  

---

## 🔀 Alternate Version (Static Build)
There’s also a **hardcoded version of this portfolio** (no backend required).  
- All text and projects are defined directly in the code.  
- Useful for quick demos, offline use, or when no CMS is needed.  
- I plan to keep it in a **separate repository** for clarity.  

---

## 🚀 Deployment
This project is optimized for hosting on **Vercel** or **Netlify**.

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/lagostechboy-portfolio.git
cd lagostechboy-portfolio

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
Update API URLs to point to your WordPress backend.

Push to GitHub → Connect to Vercel → Deploy with one click.

📜 License
This project is licensed under the MIT License – free to use and adapt.

💡 Built with care by LagosTechBoy 🖤
