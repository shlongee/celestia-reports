const THEME_KEY = "theme";
const CRYSTAL_KEY = "shlongeeland-crystal";

export function applyStoredModes(): void {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const isDark =
        savedTheme === "dark" ||
        (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    document.documentElement.classList.toggle("dark", isDark);

    const isCrystal = localStorage.getItem(CRYSTAL_KEY) === "true";
    document.documentElement.classList.toggle("crystal", isCrystal);

    document.querySelectorAll<HTMLButtonElement>("[data-glass-toggle]").forEach((btn) => btn.setAttribute("aria-pressed", String(isCrystal)));
    
    document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => btn.setAttribute("aria-pressed", String(isDark)));
}

let controlsBound = false;

export function mountArcaneControls(): void {
    applyStoredModes();
    if (controlsBound) return;
    controlsBound = true;

    document.addEventListener("click", (event) => {
        const target = event.target as Element | null;

        const themeBtn = target?.closest<HTMLButtonElement>("[data-theme-toggle]");
        if (themeBtn) {
            const nextDark = !document.documentElement.classList.contains("dark");
            document.documentElement.classList.toggle("dark", nextDark);
            localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
            applyStoredModes();
            window.dispatchEvent(new CustomEvent("shlongeeland:theme"));
            return;
        }

        const glassBtn = target?.closest<HTMLButtonElement>("[data-glass-toggle]");
        if (glassBtn) {
            const nextCrystal = !document.documentElement.classList.contains("crystal");
            document.documentElement.classList.toggle("crystal", nextCrystal);
            localStorage.setItem(CRYSTAL_KEY, String(nextCrystal));
            applyStoredModes();
            return;
        }

        const shuffleBtn = target?.closest<HTMLButtonElement>("[data-wormhole-shuffle]");
        if (shuffleBtn) {
            shuffleBtn.classList.remove("is-spinning");
            void shuffleBtn.offsetWidth;
            shuffleBtn.classList.add("is-spinning");
            window.dispatchEvent(new CustomEvent("shlongeeland:shuffle"));
            return;
        }

        const menuBtn = target?.closest<HTMLButtonElement>("[data-menu-toggle]");
        if (menuBtn) {
            const expanded = menuBtn.getAttribute("aria-expanded") === "true";
            menuBtn.setAttribute("aria-expanded", String(!expanded));
        }
    });

    document.addEventListener("astro:after-swap", applyStoredModes);
    document.addEventListener("astro:page-load", applyStoredModes);
}