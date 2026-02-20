import React, { useState, useEffect } from 'react';

const OpenInNewTabButton: React.FC = () => {
  const [cleanUrl, setCleanUrl] = useState<string>('#');
  const [canOpen, setCanOpen] = useState<boolean>(false);

  useEffect(() => {
    let urlToOpen: string | null = null;
    let foundUrl = false;

    // Heuristic 1: Try to extract App ID from the current blob URL's pathname.
    // The blob URL seems to be structured like:
    // blob:https://<...>.usercontent.goog/<app-id-uuid>
    if (window.location.hostname.endsWith('.usercontent.goog') && window.location.pathname.length > 1) {
      try {
        const pathParts = window.location.pathname.substring(1).split('/');
        const potentialAppId = pathParts[0];

        // A basic check to see if it looks like a UUID, which AI Studio uses for app IDs.
        if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/i.test(potentialAppId)) {
          const url = new URL(`https://aistudio.google.com/apps/${potentialAppId}`);
          url.searchParams.set('showAssistant', 'false');
          url.searchParams.set('showPreview', 'true');
          urlToOpen = url.toString();
          foundUrl = true;
        }
      } catch (e) {
        // Could fail if URL constructor has issues, though unlikely here.
        console.error("Error constructing URL from pathname heuristic:", e);
      }
    }

    // Heuristic 2: Fallback to referrer if the first heuristic fails.
    if (!foundUrl) {
      let parentUrlStr: string | null = null;
      try {
        // This will likely fail due to cross-origin restrictions.
        parentUrlStr = window.top.location.href;
      } catch (e) {
        // Fallback to referrer, which is the most common way to get the parent URL.
        parentUrlStr = document.referrer;
      }

      if (parentUrlStr && parentUrlStr.includes('aistudio.google.com/apps/')) {
        try {
          const url = new URL(parentUrlStr);
          url.searchParams.set('showAssistant', 'false');
          url.searchParams.set('showPreview', 'true');
          urlToOpen = url.toString();
          foundUrl = true;
        } catch (error) {
          console.error('Error parsing the referrer URL:', error);
        }
      }
    }

    if (foundUrl && urlToOpen) {
      setCleanUrl(urlToOpen);
      setCanOpen(true);
    } else {
      console.warn('Could not determine a valid app URL. The "Open in new tab" button will be disabled.');
      setCleanUrl('#');
      setCanOpen(false);
    }
  }, []);

  const buttonTitle = canOpen
    ? "Abrir em nova aba"
    : "Não foi possível determinar o URL para abrir em nova aba";

  return (
    <a
      href={cleanUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={buttonTitle}
      className={`fixed bottom-6 right-6 z-50 p-4 bg-light-primary dark:bg-dark-primary text-white rounded-full shadow-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary dark:focus:ring-dark-primary dark:focus:ring-offset-dark-bg ${
        canOpen
          ? 'hover:opacity-90 hover:scale-110 cursor-pointer'
          : 'opacity-50 cursor-not-allowed'
      }`}
      aria-label="Abrir visualização em uma nova aba do navegador"
      onClick={(e) => !canOpen && e.preventDefault()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
};

export default OpenInNewTabButton;