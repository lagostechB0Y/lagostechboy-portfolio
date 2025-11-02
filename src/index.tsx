/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- CONFIGURATION ---
// This is a live demo API. It doesn't have the custom fields, so the app will use fallbacks.
// IMPORTANT: Replace this URL with your actual WordPress REST API endpoint once it's set up.
const WP_API_URL = import.meta.env.VITE_WP_API_URL;


// It's recommended to set up a custom post type 'projects' and an 'about' page.
// Use a plugin like Advanced Custom Fields (ACF) to create fields and expose them to the REST API.
// Assumed ACF fields for 'projects': short_description, stack, description, live_url, repo_url.
// Assumed 'about' page has a featured image for the profile photo.
// Assumed a custom endpoint for site options: /wp-json/v1/site-options (for logo, hero, contact). This is optional.


// --- TYPE DEFINITIONS ---
interface WP_Project {
    id: number;
    slug: string;
    title: { rendered: string };
    // ACF fields might not exist on all post types, so they are optional.
    acf?: {
        short_description: string;
        stack: string;
        description: string;
        live_url: string;
        repo_url: string;
    };
    // Adding excerpt for fallback content from standard posts.
    excerpt?: {
        rendered: string;
    }
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
    contact: {
        email: string;
        linkedin: string;
        github: string;
    };
}

document.addEventListener('DOMContentLoaded', () => {

    const allProjects = new Map<number, WP_Project>();
    const projectsPerPage = 3;
    let currentPage = 1;
    let totalPages = 1;

    // --- Element Selectors ---
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
        const response = await fetch(`${WP_API_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
        }
        return response;
    };
    
    const fetchProjects = async (page = 1) => {
        // NOTE: Changed to '/wp/v2/posts' to work with the demo API. 
        // Change back to '/wp/v2/projects' when using your own backend.
        const response = await apiFetch(`/wp/v2/project?per_page=${projectsPerPage}&page=${page}&_embed`);
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        const projects: WP_Project[] = await response.json();
        return { projects, totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1 };
    };

    const fetchAboutPage = async (): Promise<WP_Page> => {
        // NOTE: Changed to slug 'sample-page' which exists on the demo API.
        // Change back to 'about' when using your own backend.
        const response = await apiFetch('/wp/v2/pages?slug=about&_embed');
        const pages: WP_Page[] = await response.json();
        if (pages.length === 0) throw new Error("About page not found.");
        return pages[0];
    };
    
    const fetchSiteOptions = async (): Promise<SiteOptions | null> => {
        try {
            // This assumes a custom endpoint. It will fail on the demo API, and the app will use fallbacks.
            const response = await apiFetch('/v1/site-options');
            return await response.json();
        } catch (error) {
            console.warn("Could not fetch site options from custom endpoint. Using fallback data.", error);
            return null;
        }
    };


    // --- Rendering Functions ---
    const renderErrorMessage = (container: Element | null, message: string) => {
        if (container) {
            container.innerHTML = `<p class="error-message" style="text-align: center; color: var(--secondary-text-color);">${message}</p>`;
        }
    };

    const renderProjects = (projects: WP_Project[]) => {
        if (!projectListEl) return;
        projectListEl.innerHTML = ''; // Clear previous page
        if (projects.length === 0) {
            renderErrorMessage(projectListEl, "// No projects found.");
            return;
        }
        projects.forEach((project, index) => {
            allProjects.set(project.id, project); // Cache project data
            const projectEl = document.createElement('div');
            projectEl.className = 'project-item fade-in';
            projectEl.dataset.id = project.id.toString();
            projectEl.dataset.slug = project.slug;

            const projectNumber = (currentPage - 1) * projectsPerPage + index + 1;
            
            // Use excerpt as a fallback for short description
            const shortDesc = project.acf?.short_description || project.excerpt?.rendered.replace(/<[^>]*>?/gm, '').trim() || 'A project by LagosTechBoy.';

            projectEl.innerHTML = `
                <div class="project-header">
                    <span class="line-number">${projectNumber.toString().padStart(2, '0')}</span>
                    <h3>${project.title.rendered}</h3>
                    <p>${shortDesc}</p>
                    <button class="view-file-btn" aria-label="View details for ${project.title.rendered}">[ view file ]</button>
                </div>
            `;
            projectListEl.appendChild(projectEl);
            setTimeout(() => projectEl.classList.add('visible'), 50 * index);
        });
    };

    const renderAboutContent = (page: WP_Page) => {
        const bioEl = document.querySelector('.bio');
        const photoEl = document.getElementById('about-photo') as HTMLImageElement;
        const photoPlaceholderEl = document.getElementById('about-photo-placeholder');
        
        if (bioEl) {
            bioEl.innerHTML = page.content.rendered;
        }

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
        // Render Logo
        const logoEl = document.querySelector('.logo-placeholder');
        if (logoEl && options?.logo_text) logoEl.textContent = options.logo_text;
    
        // Render Hero Title
        const heroTitleEl = document.querySelector('.ltb-title');
        if (heroTitleEl && options?.hero_title) {
            const parts = options.hero_title.split('|');
            heroTitleEl.innerHTML = `
                <span class="ltb-part" style="--d: 0s;">${parts[0] || ''}</span>
                <span class="ltb-part" style="--d: 0.2s;">${parts[1] || ''}</span>
                <span class="ltb-part" style="--d: 0.4s;">${parts[2] || ''}</span>
                <span class="cursor" style="--d: 0.6s;">_</span>
            `;
        }
        
        // Setup Typewriter with dynamic text
        const subtitle = options?.hero_subtitle || "> Software Engineer | WordPress & Laravel Specialist";
        const line2El = document.getElementById('typewriter-line2');
        if (line2El) {
            setTimeout(() => typeLine(line2El, subtitle), 1200);
        }
    
        // Render Contact Links
        const socialLinksEl = document.querySelector('.social-links');
        if (socialLinksEl && options?.contact) {
            socialLinksEl.innerHTML = `
                <a href="mailto:${options.contact.email}" class="social-link" aria-label="Email">email(<span class="string-literal">"${options.contact.email}"</span>)</a>
                <a href="https://linkedin.com/in${options.contact.linkedin}" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">linkedin(<span class="string-literal">"/in${options.contact.linkedin}"</span>)</a>
                <a href="https://github.com/${options.contact.github}" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="GitHub">github(<span class="string-literal">"/${options.contact.github}"</span>)</a>
            `;
        } else if (socialLinksEl) {
            // Fallback content
            socialLinksEl.innerHTML = `
                <a href="mailto:hello@lagostechboy.dev" class="social-link" aria-label="Email">email(<span class="string-literal">"hello@lagostechboy.dev"</span>)</a>
                <a href="#" class="social-link" aria-label="LinkedIn">linkedin(<span class="string-literal">"/in/lagostechboy"</span>)</a>
                <a href="#" class="social-link" aria-label="GitHub">github(<span class="string-literal">"/LagosTechBoy"</span>)</a>
            `;
        }
    };
    

    // --- Core Logic & Initializers ---

    const loadAndRenderProjects = async (page: number) => {
        if(projectListEl) projectListEl.innerHTML = `<p style="text-align: center; color: var(--secondary-text-color);">// Loading projects...</p>`;
        try {
            const data = await fetchProjects(page);
            currentPage = page;
            totalPages = data.totalPages;
            renderProjects(data.projects);
            updatePaginationControls();
        } catch (error) {
            console.error("Failed to load projects:", error);
            renderErrorMessage(projectListEl, "// Could not load projects.");
        }
    };
    
    const initializeApp = async () => {
        try {
            const [siteOptions, aboutData] = await Promise.all([
                fetchSiteOptions(),
                fetchAboutPage()
            ]);
            renderSiteOptions(siteOptions);
            renderAboutContent(aboutData);
        } catch (error) {
            console.error("Failed to initialize page content:", error);
            renderErrorMessage(document.querySelector('.bio'), "// Could not load page content.");
        }
        await loadAndRenderProjects(currentPage);
        handleInitialHash();
    };

    // --- Theme Switcher Logic ---
    const applyTheme = (theme: 'light' | 'dark') => {
        docElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { console.warn('LocalStorage is not available.', e); }
    };
    const toggleTheme = () => applyTheme(docElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    const savedTheme = (() => { try { return localStorage.getItem('theme') as 'light' | 'dark' | null; } catch (e) { return null; } })();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) applyTheme(savedTheme); else if (prefersDark) applyTheme('dark'); else applyTheme('light');


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
        }, 100);
    };

    // --- Project Viewer Logic ---
    const openProjectViewer = (projectId: number) => {
        const project = allProjects.get(projectId);
        if (!project) return;
        
        const filenameEl = projectViewerOverlay.querySelector('.project-viewer-filename span');
        const titleEl = document.getElementById('project-viewer-title');
        const stackListEl = document.getElementById('project-viewer-stack-list');
        const descriptionEl = document.getElementById('project-viewer-description');
        const liveLinkEl = document.getElementById('project-viewer-live-link') as HTMLAnchorElement;
        const repoLinkEl = document.getElementById('project-viewer-repo-link') as HTMLAnchorElement;

        if (filenameEl) filenameEl.textContent = `${project.slug}.md`;
        if (titleEl) titleEl.textContent = project.title.rendered;
        if (descriptionEl) descriptionEl.innerHTML = project.acf?.description || project.excerpt?.rendered || '';
        if (liveLinkEl) {
            liveLinkEl.href = project.acf?.live_url || '#';
            liveLinkEl.style.display = project.acf?.live_url ? 'inline-block' : 'none';
        }
        if (repoLinkEl) {
            repoLinkEl.href = project.acf?.repo_url || '#';
            repoLinkEl.style.display = project.acf?.repo_url ? 'inline-block' : 'none';
        }
        if (stackListEl && project.acf?.stack) {
            stackListEl.innerHTML = '';
            project.acf.stack.split(',').forEach(tech => {
                const li = document.createElement('li');
                li.textContent = tech.trim();
                stackListEl.appendChild(li);
            });
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
            const viewBtn = target.closest('.view-file-btn');
            if (viewBtn) {
                e.preventDefault();
                const projectItem = viewBtn.closest('.project-item') as HTMLElement;
                const projectId = projectItem.dataset.id;
                if (projectId) {
                    openProjectViewer(parseInt(projectId, 10));
                }
            }
        });
    }

    if (projectViewerCloseBtn) projectViewerCloseBtn.addEventListener('click', closeProjectViewer);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProjectViewer(); });
    projectViewerOverlay.addEventListener('click', (e) => { if (e.target === projectViewerOverlay) closeProjectViewer(); });
    
    // --- Hash-based Routing for Projects ---
    const handleHashChange = async () => {
        const hash = window.location.hash;
        const projectSlug = hash.startsWith('#work/') ? hash.substring(6) : null;
        
        if (projectSlug) {
            if (!document.body.classList.contains('project-view-active')) {
                let projectToOpen: WP_Project | undefined;
                for (const p of allProjects.values()) {
                    if (p.slug === projectSlug) { projectToOpen = p; break; }
                }

                if (projectToOpen) {
                    openProjectViewer(projectToOpen.id);
                } else {
                    try {
                        // NOTE: Uses '/posts' for demo. Change to '/projects' for your site.
                        const response = await apiFetch(`/wp/v2/posts?slug=${projectSlug}&_embed`);
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

    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) loadAndRenderProjects(currentPage + 1);
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) loadAndRenderProjects(currentPage - 1);
    });
    
    // --- Misc & Unchanged Logic ---
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
            if (href) {
                const targetElement = document.querySelector(href);
                if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
            }
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
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
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

    // --- Start the App ---
    initializeApp();
});