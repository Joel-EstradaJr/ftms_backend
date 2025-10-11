/**
 * Global type declarations for the application
 * This file provides type definitions for CSS modules and other side-effect imports
 */

// CSS Module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Allow side-effect CSS imports
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// SCSS support (if needed in future)
declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
