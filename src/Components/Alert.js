import React from 'react'; // Importing React library for JSX and component creation

const Alert = ({ children, className = '' }) => ( // Alert component with props: children (content) and className (optional styling)
  <div className={`p-4 mb-4 text-sm rounded-lg ${className}`} role="alert"> // Alert container with padding, margin, text size, and rounded corners
    {children} // Renders any nested components or elements inside <Alert>...</Alert>
  </div>
);

export const AlertTitle = ({ children }) => ( // Subcomponent for the alert title; receives title text as children
  <h3 className="font-medium">{children}</h3> // Renders the title with medium font weight inside an h3 tag
);

export const AlertDescription = ({ children }) => ( // Subcomponent for the alert description; receives message text as children
  <div>{children}</div> // Renders the description inside a simple div
);

export default Alert; // Exports Alert as the default export from this file
