import { useEffect } from "react";

interface StructuredData {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

interface SEOProps {
  title: string;
  description: string;
  structuredData?: StructuredData;
}

export const useSEO = ({ title, description, structuredData }: SEOProps) => {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Set or update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", description);

    // Handle JSON-LD structured data
    if (structuredData) {
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) {
        existingScript.remove();
      }
      
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [title, description, structuredData]);
};

