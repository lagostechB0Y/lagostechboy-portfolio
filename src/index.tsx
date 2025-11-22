// Fix for errors: "Cannot find type definition file for 'vite/client'." and "Property 'env' does not exist on type 'ImportMeta'."
// The original `/// <reference types="vite/client" />` is removed because it was causing an error,
// likely due to a missing or misconfigured tsconfig.json. This manual declaration provides the necessary types for Vite's environment variables.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_WP_API_URL: string;
    };
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const WP_API_URL = import.meta.env.VITE_WP_API_URL;
if (!WP_API_URL) {
  console.error("VITE_WP_API_URL is not defined in your environment file. Please add it to your .env file.");
  document.body.innerHTML = '<div style="color: red; text-align: center; padding-top: 50px; font-family: sans-serif;"><h1>Configuration Error</h1><p>The WordPress API URL is not configured. Please contact the site administrator.</p></div>';
}

// --- DATA STRUCTURES ---
interface WP_Project {
    id: number;
    slug: string;
    title: { rendered: string };
    acf?: {
        short_description: string;
        stack: string;
        description: string;
        live_url: string;
        repo_url: string;
    };
    excerpt?: {
        rendered: string;
    };
    _embedded?: {
        'wp:featuredmedia'?: [{
            source_url: string;
            alt_text: string;
        }];
    };
}

interface WP_Page {
    content: { rendered: string };
    _embedded?: {
        'wp:featuredmedia'?: [{
            source_url: string;
            alt_text: string;
        }];
    };
}

interface SiteOptions {
    logo_text: string;
    hero_title: string;
    hero_subtitle: string;
    contact?: {
        email: string;
        linkedin: string;
        github: string;
    };
}

document.addEventListener('DOMContentLoaded', () => {

    const allProjects = new Map<number, WP_Project>();
    const projectsPerPage = 4;
    let currentPage = 1;
    let totalPages = 1;

    // --- DOM Element References ---
    const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;
    const docElement = document.documentElement;
    const projectViewerOverlay = document.getElementById('project-viewer-overlay') as HTMLElement;
    const projectViewerCloseBtn = document.getElementById('project-viewer-close') as HTMLButtonElement;
    const projectListEl = document.querySelector('.project-list');
    const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    const paginationControls = document.querySelector('.pagination-controls');

    // --- API Fetching Functions ---
    const apiFetch = async (endpoint: string) => {
        if (!WP_API_URL) return; // Stop fetching if URL isn't set
        const response = await fetch(`${WP_API_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
        }
        return response;
    };
    
    const fetchProjects = async (page = 1) => {
        const endpoint = `/wp/v2/project`;
        const response = await apiFetch(`${endpoint}?per_page=${projectsPerPage}&page=${page}&_embed`);
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        const projects: WP_Project[] = await response.json();
        return { projects, totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1 };
    };

    const fetchAboutPage = async (): Promise<WP_Page> => {
        const slug = 'about';
        const response = await apiFetch(`/wp/v2/pages?slug=${slug}&_embed`);
        const pages: WP_Page[] = await response.json();
        if (pages.length === 0) throw new Error("About page not found.");
        return pages[0];
    };
    
    /* const fetchSiteOptions = async (): Promise<SiteOptions | null> => {
        try {
            const response = await apiFetch('/v1/site-options');
            return await response.json();
        } catch (error) {
            console.warn("Could not fetch site options from custom endpoint. Using fallbacks.", error);
            return null;
        }
    };

    */
    async function fetchSiteOptions(): Promise<SiteOptions | null> {
        try {
            const response = await apiFetch('/v1/site-options');
            // apiFetch may return undefined when WP_API_URL is not set; handle that case.
            if (!response) {
                console.warn('WP_API_URL is not configured; skipping site options fetch.');
                return null;
            }
            if (!response.ok) {
                console.warn(`Failed to fetch site options: ${response.status} ${response.statusText}`);
                return null;
            }
            const data = await response.json();
            return data as SiteOptions;
        } catch (error) {
            console.warn("Could not fetch site options from custom endpoint. Using fallbacks.", error);
            return null;
        }
    };
   
    // --- UI Rendering Functions ---
    const renderErrorMessage = (container: Element | null, message: string) => {
        if (container) {
            container.innerHTML = `<p class="error-message" style="text-align: center; color: var(--secondary-text-color); grid-column: 1 / -1;">${message}</p>`;
        }
    };

    const renderProjectSkeletons = () => {
        if (!projectListEl) return;
        projectListEl.innerHTML = '';
        for (let i = 0; i < projectsPerPage; i++) {
            const skeletonEl = document.createElement('div');
            skeletonEl.className = 'project-skeleton';
            skeletonEl.innerHTML = `
                <div class="skeleton-line h3"></div>
                <div class="skeleton-line p"></div>
                <div class="skeleton-line p"></div>
            `;
            projectListEl.appendChild(skeletonEl);
        }
    };

    const renderProjects = (projects: WP_Project[]) => {
        if (!projectListEl) return;
        projectListEl.innerHTML = ''; 

        if (projects.length === 0) {
            renderErrorMessage(projectListEl, "// No projects found.");
            return;
        }

        projects.forEach((project) => {
            allProjects.set(project.id, project); 
            
            const projectEl = document.createElement('div');
            projectEl.className = 'project-item fade-in';
            projectEl.dataset.id = project.id.toString();
            projectEl.dataset.slug = project.slug;
            
            const shortDesc = project.acf?.short_description || project.excerpt?.rendered.replace(/<[^>]*>?/gm, '').trim() || 'A project by LagosTechBoy.';

            projectEl.innerHTML = `
                <div class="project-header">
                    <h3>${project.title.rendered}</h3>
                    <p>${shortDesc}</p>
                    <button class="view-file-btn" aria-label="View details for ${project.title.rendered}">View Project</button>
                </div>
            `;
            projectListEl.appendChild(projectEl);
        });

        // Re-observe new elements for fade-in effect
        document.querySelectorAll('.project-item.fade-in').forEach(elem => fadeObserver.observe(elem));
    };

    const renderAboutContent = (page: WP_Page) => {
        const bioContentEl = document.getElementById('bio-content-wrapper');
        const photoEl = document.getElementById('about-photo') as HTMLImageElement;
        const photoPlaceholderEl = document.getElementById('about-photo-placeholder');
        
        if (bioContentEl) bioContentEl.innerHTML = page.content.rendered;

        const imageUrl = page._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        if (photoEl && photoPlaceholderEl && imageUrl) {
            photoEl.src = imageUrl;
            photoEl.alt = page._embedded?.['wp:featuredmedia']?.[0]?.alt_text || 'A photo of LagosTechBoy';
            photoEl.onload = () => {
                photoEl.style.display = 'block';
                photoPlaceholderEl.style.display = 'none';
            };
        }
    };
    
    const renderSiteOptions = (options: SiteOptions | null) => {
        const logoText = options?.logo_text || 'LTB';
        const heroTitle = options?.hero_title || 'Lagos|Tech|Boy';
        const heroSubtitle = options?.hero_subtitle || '> PHP & Laravel Developer | WordPress Expert';

        const logoEl = document.querySelector('.logo-placeholder');
        if (logoEl) logoEl.textContent = logoText;
    
        const heroTitleEl = document.querySelector('.ltb-title');
        if (heroTitleEl) {
            const parts = heroTitle.split('|');
            heroTitleEl.innerHTML = `
                <span class="ltb-part" style="--d: 0s;">${parts[0] || ''}</span>
                <span class="ltb-part" style="--d: 0.2s;">${parts[1] || ''}</span>
                <span class="ltb-part" style="--d: 0.4s;">${parts[2] || ''}</span>
            `;
        }
        
        const line2El = document.getElementById('typewriter-line2');
        if (line2El) {
            setTimeout(() => typeLine(line2El, heroSubtitle), 1200);
        }
    
        const socialLinksEl = document.querySelector('.social-links');
        if (socialLinksEl) {
            socialLinksEl.innerHTML = `
                <a href="mailto:hello@lagostechboy.com" class="social-link" aria-label="Email" title="Email">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"></path><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"></path></svg>
                </a>
                <a href="https://linkedin.com/in/techboyade" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path></svg>
                </a>
                <a href="https://github.com/LagosTechB0Y" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clip-rule="evenodd"></path></svg>
                </a>
            `;
        }
    };

    // --- Application Core & Initialization ---
    const loadAndRenderProjects = async (page: number) => {
        renderProjectSkeletons();
        try {
            const data = await fetchProjects(page);
            currentPage = page;
            totalPages = data.totalPages;
            renderProjects(data.projects);
            updatePaginationControls();
        } catch (error) {
            console.error("Failed to load projects:", error);
            renderErrorMessage(projectListEl, "// Could not load projects from the API.");
            if (paginationControls) (paginationControls as HTMLElement).style.display = 'none';
        }
    };
    
    const initializeApp = async () => {
        if (!WP_API_URL) return; // Don't initialize if the URL is missing
        const aboutBioContainer = document.querySelector('#bio-content-wrapper');
        try {
            const [siteOptions, aboutData] = await Promise.all([
                fetchSiteOptions(),
                fetchAboutPage()
            ]);
            renderSiteOptions(siteOptions);
            renderAboutContent(aboutData);
        } catch (error) {
            console.error("Failed to initialize page content:", error);
            renderSiteOptions(null); // Render fallbacks for site options
            renderErrorMessage(aboutBioContainer, "// page content is being loaded.");
        }
        
        await loadAndRenderProjects(currentPage);
        handleInitialHash();
    };

    // --- Theme Switcher ---
    const applyTheme = (theme: 'light' | 'dark') => {
        docElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { console.warn('LocalStorage is not available.', e); }
    };
    const toggleTheme = () => applyTheme(docElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    const savedTheme = (() => { try { return localStorage.getItem('theme') as 'light' | 'dark' | null; } catch (e) { return null; } })();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // --- Typewriter Effect ---
    const typeLine = (element: HTMLElement, text: string, callback?: () => void) => {
        let i = 0;
        element.innerHTML = "";
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
                if (callback) callback();
            }
        }, 50);
    };

    // --- Project Viewer (Modal) Logic ---
    const openProjectViewer = (projectId: number) => {
        const project = allProjects.get(projectId);
        if (!project) return;
        
        const imagePlaceholderEl = projectViewerOverlay.querySelector('.project-viewer-image-placeholder');
        const filenameEl = projectViewerOverlay.querySelector('.project-viewer-filename');
        const titleEl = document.getElementById('project-viewer-title');
        const stackListEl = document.getElementById('project-viewer-stack-list');
        const descriptionEl = document.getElementById('project-viewer-description');
        const liveLinkEl = document.getElementById('project-viewer-live-link') as HTMLAnchorElement;
        const repoLinkEl = document.getElementById('project-viewer-repo-link') as HTMLAnchorElement;

        if (filenameEl) filenameEl.textContent = project.title.rendered;
        if (titleEl) titleEl.textContent = project.title.rendered;
        
        // Render project's featured image
        if (imagePlaceholderEl) {
            const imageUrl = project._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            if (imageUrl) {
                const altText = project._embedded?.['wp:featuredmedia']?.[0]?.alt_text || `Featured image for ${project.title.rendered}`;
                imagePlaceholderEl.innerHTML = `<img src="${imageUrl}" alt="${altText}" />`;
            } else {
                imagePlaceholderEl.innerHTML = `<span style="color: var(--secondary-text-color); font-size: 0.9rem;">// No featured image</span>`;
            }
        }

        if (descriptionEl) descriptionEl.innerHTML = project.acf?.description || project.excerpt?.rendered || '';
        if (liveLinkEl) {
            liveLinkEl.href = project.acf?.live_url || '#';
            liveLinkEl.style.display = project.acf?.live_url ? 'inline-block' : 'none';
        }
        if (repoLinkEl) {
            repoLinkEl.href = project.acf?.repo_url || '#';
            repoLinkEl.style.display = project.acf?.repo_url ? 'inline-block' : 'none';
        }
        if (stackListEl) {
            stackListEl.innerHTML = '';
            if (project.acf?.stack) {
                project.acf.stack.split(',').forEach(tech => {
                    const li = document.createElement('li');
                    li.textContent = tech.trim();
                    stackListEl.appendChild(li);
                });
            } else {
                stackListEl.innerHTML = '<li>N/A</li>';
            }
        }
        
        document.body.classList.add('project-view-active');
        projectViewerOverlay.classList.add('visible');
        projectViewerOverlay.setAttribute('aria-hidden', 'false');
        
        const newHash = `#work/${project.slug}`;
        if (window.location.hash !== newHash) {
            try { history.pushState(null, '', newHash); } catch (e) { location.hash = newHash; }
        }
    };
    
    const closeProjectViewer = () => {
        document.body.classList.remove('project-view-active');
        projectViewerOverlay.classList.remove('visible');
        projectViewerOverlay.setAttribute('aria-hidden', 'true');
        if (window.location.hash.startsWith('#work/')) {
            try { history.pushState('', document.title, window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
        }
    };

    if (projectListEl) {
        projectListEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const projectItem = target.closest('.project-item') as HTMLElement;
            if (projectItem) {
                e.preventDefault();
                const projectId = projectItem.dataset.id;
                if (projectId) openProjectViewer(parseInt(projectId, 10));
            }
        });
    }

    if (projectViewerCloseBtn) projectViewerCloseBtn.addEventListener('click', closeProjectViewer);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProjectViewer(); });
    projectViewerOverlay.addEventListener('click', (e) => { if (e.target === projectViewerOverlay) closeProjectViewer(); });
    
    // --- URL Hash-based Routing ---
    const handleHashChange = async () => {
        const projectSlug = window.location.hash.startsWith('#work/') ? window.location.hash.substring(6) : null;
        
        if (projectSlug) {
            if (!document.body.classList.contains('project-view-active')) {
                let projectToOpen = Array.from(allProjects.values()).find(p => p.slug === projectSlug);

                if (projectToOpen) {
                    openProjectViewer(projectToOpen.id);
                } else {
                    try {
                        const endpoint = '/wp/v2/projects';
                        const response = await apiFetch(`${endpoint}?slug=${projectSlug}&_embed`);
                        const projects: WP_Project[] = await response.json();
                        if (projects.length > 0) {
                            const project = projects[0];
                            allProjects.set(project.id, project);
                            openProjectViewer(project.id);
                        }
                    } catch (e) { console.error('Failed to fetch project by slug', e); }
                }
            }
        } else if (document.body.classList.contains('project-view-active')) {
            closeProjectViewer();
        }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    const handleInitialHash = () => {
        if (window.location.hash.startsWith('#work/')) {
            setTimeout(handleHashChange, 100);
        }
    };
    
    // --- Project Pagination ---
    const updatePaginationControls = () => {
        if (!paginationControls) return;
        if (totalPages <= 1) {
            (paginationControls as HTMLElement).style.display = 'none';
        } else {
            (paginationControls as HTMLElement).style.display = 'flex';
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        }
    };

    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) loadAndRenderProjects(currentPage + 1); });
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) loadAndRenderProjects(currentPage - 1); });
    
    // --- Miscellaneous UI Enhancements ---
    window.addEventListener('mousemove', (e) => {
        docElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        docElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(elem => fadeObserver.observe(elem));

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (this: HTMLAnchorElement, e: MouseEvent) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#work/')) return;
            e.preventDefault();
            if (href) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    const sections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('.main-nav a');
    const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { root: null, rootMargin: `-${headerHeight}px 0px -40% 0px`, threshold: 0 });
    sections.forEach(section => { if (section.id) navObserver.observe(section); });

    const scrollToTopBtn = document.getElementById('scroll-to-top') as HTMLButtonElement;
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            scrollToTopBtn.classList.toggle('visible', window.scrollY > window.innerHeight / 2);
        });
        scrollToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    initializeApp();
});
