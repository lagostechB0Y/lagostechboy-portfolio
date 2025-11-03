# LagosTechBoy - Personal Portfolio Website

This is a modern, single-page portfolio website for a software engineer. It's built with TypeScript and Vite, designed to be powered by a headless WordPress backend via the REST API. The project features a clean, developer-centric aesthetic with a dark/light theme toggle, smooth animations, and dynamic content fetching.

## ✨ Features

- **Dynamic Content**: Fetches projects, about page content, and site-wide settings from a WordPress REST API.
- **Headless CMS Ready**: Easily connect to your own WordPress installation for content management.
- **Fallback API**: Works out-of-the-box using a public demo WordPress API for easy setup and testing.
- **Responsive Design**: A mobile-first design that looks great on all screen sizes.
- **Dark/Light Mode**: User-selectable theme that persists in local storage.
- **Client-Side Routing**: View project details in a modal, with unique URLs managed via URL hash (`#work/project-slug`).
- **Modern UI/UX**: Features include a typewriter effect, fade-in animations on scroll, and an interactive background glow that follows the mouse cursor.
- **Performant**: Built with Vite for a fast development experience and optimized production builds.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (with Custom Properties), TypeScript
- **Build Tool**: Vite
- **Backend (Headless)**: WordPress & REST API
- **Fonts**: Google Fonts (Lora & Poppins)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) (which includes npm) installed on your system.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/lagostechboy-portfolio.git
    cd lagostechboy-portfolio
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will now be running on `http://localhost:5173` (or another port if 5173 is in use). By default, it will use a public demo API for content.

## ⚙️ Configuration (Connecting to Your WordPress)

To power the portfolio with your own content, you need a WordPress site with the REST API enabled.

1.  **Set up your WordPress site:**
    - It's recommended to create a custom post type called `projects`.
    - Create an 'About' page with the slug `about`.
    - Use a plugin like [Advanced Custom Fields (ACF)](https://www.advancedcustomfields.com/) to add the following fields to your `projects` post type and expose them to the REST API:
        - `short_description` (Text)
        - `stack` (Text, comma-separated, e.g., "React, TypeScript, CSS")
        - `description` (Wysiwyg Editor)
        - `live_url` (URL)
        - `repo_url` (URL)

2.  **Configure the API endpoint:**
    - Create a `.env` file in the root of the project directory.
    - Add your WordPress REST API URL to the `.env` file:
      ```
      VITE_WP_API_URL=https://your-wordpress-site.com/wp-json
      ```
    - The app will automatically use this URL instead of the demo API.

## 📦 Build for Production

To create a production-ready build of the app:

```bash
npm run build
```

This will generate a `dist` folder with optimized static assets that you can deploy to any static hosting provider.

## 📄 License

This project is licensed under the Apache-2.0 License.
